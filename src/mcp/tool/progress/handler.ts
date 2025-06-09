import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ResultAsync } from 'neverthrow';
import { ProgressToolParameters, ProgressToolResponse } from './schema.js';
import { toCallToolResult } from '../util.js';
import { loadCurrentPlan, savePlan } from '../../../effect/storage/planStorage.js';
import { TaskAggregate, UpdateProgressCommand } from '../../../domain/command/task/aggregate.js';
import { PrTaskStatus } from '../../../domain/term/task/status.js';
import { WorkPlan } from '../../../domain/term/plan/work_plan.js';
import { ID } from '../../../common/primitive.js';

const createCommand = (plan: WorkPlan, args: ProgressToolParameters): UpdateProgressCommand => ({
  planId: ID.value(plan.id),
  taskId: args.taskId,
  criteriaUpdates: args.criteriaUpdates
});

const findTaskById = (plan: WorkPlan, taskId: string) =>
  plan.tasks.find(t => {
    const currentTaskId = typeof t.id === 'string' ? t.id : ID.value(t.id);
    return currentTaskId === taskId;
  });

const calculateProgress = (criteria: ReadonlyArray<{ isCompleted: boolean }>): ProgressToolResponse['task']['progress'] => {
  const total = criteria.length;
  const completed = criteria.filter(c => c.isCompleted).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { completed, total, percentage };
};

const determineNextAction = (task: { title: string; status: PrTaskStatus; acceptanceCriteria: ReadonlyArray<{ isCompleted: boolean }> }): string => {
  const progress = calculateProgress(task.acceptanceCriteria);
  
  if (progress.percentage === 100) {
    switch (task.status.type) {
      case 'Implemented':
        return `All acceptance criteria completed! Task "${task.title}" is ready for review.`;
      case 'Refined':
        return `All acceptance criteria completed! Task "${task.title}" has been automatically marked as Implemented.`;
      default:
        return `All acceptance criteria completed for task "${task.title}".`;
    }
  } else {
    const remaining = progress.total - progress.completed;
    return `Progress updated: ${progress.completed}/${progress.total} criteria completed (${progress.percentage}%). ${remaining} criteria remaining for task "${task.title}".`;
  }
};

const buildResponse = (task: any, nextActionText: string): ProgressToolResponse => {
  const progress = calculateProgress(task.acceptanceCriteria);
  
  const response: ProgressToolResponse = {
    nextAction: nextActionText,
    task: {
      id: typeof task.id === 'string' ? task.id : ID.value(task.id),
      title: task.title,
      status: PrTaskStatus.toString(task.status),
      acceptanceCriteria: task.acceptanceCriteria.map((criterion: any) => ({
        id: criterion.id,
        scenario: criterion.scenario,
        isCompleted: criterion.isCompleted
      })),
      progress
    }
  };
  
  return response;
};

export const progressEntryPoint = (args: ProgressToolParameters): Promise<CallToolResult> => {
  return loadCurrentPlan()
    .mapErr(storageError => ({
      type: 'StorageError' as const,
      message: `Failed to load plan: ${storageError.message}`
    }))
    .andThen(plan => {
      if (!plan) {
        return ResultAsync.fromSafePromise(Promise.resolve(null)).andThen(() => 
          ResultAsync.fromPromise(
            Promise.reject(new Error('No current plan found')),
            () => ({ type: 'PlanNotFound' as const, message: 'No current plan found' })
          )
        );
      }

      const command = createCommand(plan, args);
      const updateResult = TaskAggregate.updateProgress(plan, command);
      
      if (updateResult.isErr()) {
        return ResultAsync.fromPromise(
          Promise.reject(new Error(TaskAggregate.toProgressErrorMessage(updateResult.error))),
          () => ({
            type: 'ProgressError' as const,
            message: TaskAggregate.toProgressErrorMessage(updateResult.error)
          })
        );
      }

      const { updatedPlan } = updateResult.value;

      return savePlan(updatedPlan)
        .mapErr(storageError => ({
          type: 'StorageError' as const,
          message: `Failed to save plan: ${storageError.message}`
        }))
        .map(() => {
          const updatedTask = findTaskById(updatedPlan, args.taskId);
          if (!updatedTask) {
            throw new Error('Task not found after update');
          }
          return updatedTask;
        });
    })
    .match(
      updatedTask => {
        try {
          const nextAction = determineNextAction(updatedTask);
          const response = buildResponse(updatedTask, nextAction);
          const responseJson = JSON.stringify(response, null, 2);
          return toCallToolResult([
            response.nextAction,
            responseJson
          ], false);
        } catch (error) {
          console.error('JSON serialization error:', error);
          return toCallToolResult([`Failed to serialize response: ${error instanceof Error ? error.message : 'Unknown error'}`], true);
        }
      },
      error => {
        const errorMessage = error?.message ?? 'Unknown error occurred';
        return toCallToolResult([`Failed to update progress: ${errorMessage}`], true);
      }
    );
};