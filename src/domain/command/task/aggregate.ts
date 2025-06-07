import { Result, ok, err } from 'neverthrow';
import { WorkPlan } from '../../term/plan/work_plan.js';
import { PrTaskId } from '../../term/task/pr_task_id.js';
import { PrTask } from '../../term/task/pr_task.js';
import { PrTaskStatus } from '../../term/task/status.js';
import { AcceptanceCriterion } from '../../term/task/acceptance_criterion.js';
import { ID } from '../../../common/primitive.js';

/**
 * 語彙「タスク集約」
 * domain type: aggregate
 * 
 * Task単体に対するすべての変更操作を管理する集約
 * - refinement: タスクのリファインメント
 * - (将来的に他のコマンドも追加予定)
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

// --- API section ---
/**
 * @aggregate TaskAggregate: Task単体に対するすべての変更操作を管理
 * @command refineTask: タスクをリファインメントする
 * @utility toErrorMessage: エラーをユーザー向けメッセージに変換
 */
export const TaskAggregate = {
  refineTask: refineTaskInPlan,
  toErrorMessage: RefinementError.toString
} as const;

export type { RefineTaskCommand, TaskRefinedEvent, RefinementError };