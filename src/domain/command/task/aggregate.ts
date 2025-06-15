import { Result, ok, err } from 'neverthrow';
import { WorkPlan } from '../../term/plan/work_plan.js';
import { PrTaskId } from '../../term/task/pr_task_id.js';
import { PrTask } from '../../term/task/pr_task.js';
import { PrTaskStatus } from '../../term/task/status.js';
import { AcceptanceCriterion } from '../../term/task/acceptance_criterion.js';
import { ID } from '../../../common/primitive.js';
import { Progress, ProgressUpdateRequest, ProgressError } from '../../term/task/progress.js';

/**
 * 語彙「タスク集約」
 * domain type: aggregate
 * 
 * Task単体に対するすべての変更操作を管理する集約
 * - refinement: タスクのリファインメント
 * - progress: タスクの進捗更新
 */

// --- type modeling section ---
type RefineTaskCommand = {
  planId: string;
  taskId: string;
  updates: {
    title?: string;
    description?: string;
    acceptanceCriteria?: Array<{
      scenario: string;
      given: string[];
      when: string[];
      then: string[];
    }>;
    definitionOfReady?: string[];
    dependencies?: string[];
  };
};

type TaskRefinedEvent = {
  type: 'TaskRefined';
  planId: string;
  taskId: string;
  previousStatus: PrTaskStatus;
  updates: RefineTaskCommand['updates'];
  refinedAt: Date;
};

type RefinementError =
  | { type: 'TaskNotFound'; taskId: string }
  | { type: 'ValidationError'; message: string };

type UpdateProgressCommand = {
  planId: string;
  taskId: string;
  criteriaUpdates: Array<{
    id: string;
    completed: boolean;
  }>;
};

type ProgressUpdatedEvent = {
  type: 'ProgressUpdated';
  planId: string;
  taskId: string;
  previousStatus: PrTaskStatus;
  newStatus: PrTaskStatus;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  updatedAt: Date;
};

type ProgressUpdateError =
  | { type: 'TaskNotFound'; taskId: string }
  | { type: 'InvalidStatus'; message: string }
  | { type: 'CriteriaNotFound'; message: string }
  | { type: 'NotAssigned'; message: string };

// --- implementation section ---
type RefineTaskInPlan = (
  plan: WorkPlan,
  command: RefineTaskCommand
) => Result<{ event: TaskRefinedEvent; updatedPlan: WorkPlan }, RefinementError>;

const refineTaskInPlan: RefineTaskInPlan = (plan, command) => {
  const task = plan.tasks.find(t => ID.value(t.id) === command.taskId);
  
  if (!task) {
    return err(RefinementError.taskNotFound(command.taskId));
  }

  const previousStatus = task.status;
  const refinedStatus = PrTaskStatus.refined();

  // Create update object for PrTask
  const taskUpdate = {
    ...command.updates,
    status: refinedStatus,
    dependencies: command.updates.dependencies?.map(id => id as PrTaskId) ?? task.dependencies
  };

  // Apply update using existing PrTask logic
  const updateResult = PrTask.applyUpdate(task, taskUpdate);
  
  if (updateResult.isErr()) {
    const errors = updateResult.error;
    return err(RefinementError.validationError(
      errors.map(e => e.message).join('; ')
    ));
  }

  const updatedTask = updateResult.value;
  
  // Handle acceptance criteria update if provided
  let finalTask = updatedTask;
  if (command.updates.acceptanceCriteria) {
    const criteriaResults = command.updates.acceptanceCriteria.map(criterion => 
      AcceptanceCriterion.create(criterion)
    );
    
    const errors = criteriaResults.filter(r => r.isErr()).flatMap(r => r.error);
    if (errors.length > 0) {
      return err(RefinementError.validationError(
        errors.map(e => e.message).join('; ')
      ));
    }
    
    const validCriteria = criteriaResults
      .filter(r => r.isOk())
      .map(r => r.value);
    
    finalTask = {
      ...finalTask,
      acceptanceCriteria: validCriteria
    };
  }

  // Handle definition of ready update if provided
  if (command.updates.definitionOfReady) {
    finalTask = {
      ...finalTask,
      definitionOfReady: command.updates.definitionOfReady
    };
  }

  const event: TaskRefinedEvent = {
    type: 'TaskRefined',
    planId: command.planId,
    taskId: command.taskId,
    previousStatus,
    updates: command.updates,
    refinedAt: new Date()
  };

  const updatedPlan: WorkPlan = {
    ...plan,
    tasks: plan.tasks.map(t => ID.value(t.id) === command.taskId ? finalTask : t),
    updatedAt: new Date()
  };

  return ok({ event, updatedPlan });
};

type UpdateProgressInPlan = (
  plan: WorkPlan,
  command: UpdateProgressCommand
) => Result<{ event: ProgressUpdatedEvent; updatedPlan: WorkPlan }, ProgressUpdateError>;

const updateProgressInPlan: UpdateProgressInPlan = (plan, command) => {
  const task = plan.tasks.find(t => ID.value(t.id) === command.taskId);
  
  if (!task) {
    return err(ProgressUpdateError.taskNotFound(command.taskId));
  }

  const previousStatus = task.status;
  
  const progressResult = Progress.update(task, {
    criteriaUpdates: command.criteriaUpdates
  });
  
  if (progressResult.isErr()) {
    const errors = progressResult.error;
    const firstError = errors[0];
    
    switch (firstError.type) {
      case 'InvalidStatus':
        return err(ProgressUpdateError.invalidStatus(firstError.message));
      case 'CriteriaNotFound':
        return err(ProgressUpdateError.criteriaNotFound(firstError.message));
      case 'NotAssigned':
        return err(ProgressUpdateError.notAssigned(firstError.message));
      default:
        throw new Error(`Unknown progress error type: ${(firstError as any).type}`);
    }
  }
  
  const { updatedTask, progress } = progressResult.value;
  
  const event: ProgressUpdatedEvent = {
    type: 'ProgressUpdated',
    planId: command.planId,
    taskId: command.taskId,
    previousStatus,
    newStatus: updatedTask.status,
    progress: {
      completed: progress.completed,
      total: progress.total,
      percentage: progress.percentage
    },
    updatedAt: new Date()
  };
  
  const updatedPlan: WorkPlan = {
    ...plan,
    tasks: plan.tasks.map(t => ID.value(t.id) === command.taskId ? updatedTask : t),
    updatedAt: new Date()
  };
  
  return ok({ event, updatedPlan });
};

// error handling
const RefinementError = {
  taskNotFound: (taskId: string): RefinementError => ({
    type: 'TaskNotFound',
    taskId
  }),
  
  validationError: (message: string): RefinementError => ({
    type: 'ValidationError',
    message
  }),
  

  toString: (error: RefinementError): string => {
    switch (error.type) {
      case 'TaskNotFound':
        return `Task not found: ${error.taskId}`;
      case 'ValidationError':
        return `Validation error: ${error.message}`;
      default:
        throw new Error(`Unknown error type: ${error satisfies never}`);
    }
  }
} as const;

const ProgressUpdateError = {
  taskNotFound: (taskId: string): ProgressUpdateError => ({
    type: 'TaskNotFound',
    taskId
  }),
  
  invalidStatus: (message: string): ProgressUpdateError => ({
    type: 'InvalidStatus',
    message
  }),
  
  criteriaNotFound: (message: string): ProgressUpdateError => ({
    type: 'CriteriaNotFound',
    message
  }),
  
  notAssigned: (message: string): ProgressUpdateError => ({
    type: 'NotAssigned',
    message
  }),
  
  toString: (error: ProgressUpdateError): string => {
    switch (error.type) {
      case 'TaskNotFound':
        return `Task not found: ${error.taskId}`;
      case 'InvalidStatus':
        return error.message;
      case 'CriteriaNotFound':
        return error.message;
      case 'NotAssigned':
        return error.message;
      default:
        throw new Error(`Unknown error type: ${error satisfies never}`);
    }
  }
} as const;

// --- API section ---
/**
 * @aggregate TaskAggregate: Task単体に対するすべての変更操作を管理
 * @command refineTask: タスクをリファインメントする
 * @command updateProgress: タスクの進捗を更新する
 * @utility toRefinementErrorMessage: リファインメントエラーをユーザー向けメッセージに変換
 * @utility toProgressErrorMessage: 進捗更新エラーをユーザー向けメッセージに変換
 */
export const TaskAggregate = {
  refineTask: refineTaskInPlan,
  updateProgress: updateProgressInPlan,
  toRefinementErrorMessage: RefinementError.toString,
  toProgressErrorMessage: ProgressUpdateError.toString
} as const;

export type { 
  RefineTaskCommand, 
  TaskRefinedEvent, 
  RefinementError,
  UpdateProgressCommand,
  ProgressUpdatedEvent,
  ProgressUpdateError
};