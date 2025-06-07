import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ResultAsync } from 'neverthrow';
import { ReviewToolParameters, taskToReviewResponse } from './schema.js';
import { nextAction } from './prompt.js';
import { toCallToolResult } from '../util.js';
import { PrTask } from '../../../domain/term/task/pr_task.js';
import { PrTaskStatus } from '../../../domain/term/task/status.js';
import { loadCurrentPlan, savePlan } from '../../../effect/storage/planStorage.js';

export const reviewEntryPoint = (args: ReviewToolParameters): Promise<CallToolResult> => {
  return loadCurrentPlan()
    .mapErr(error => ({ type: 'StorageError' as const, message: `Failed to load plan: ${error.message}` }))
    .andThen(plan => {
      if (!plan) {
        return ResultAsync.fromSafePromise(Promise.reject({
          type: 'NotFound' as const, 
          message: 'No current plan found. Please create a plan first.'
        }));
      }

      // Find the task with the given taskId
      const targetTask = plan.tasks.find(task => task.id === args.taskId);
      if (!targetTask) {
        return ResultAsync.fromSafePromise(Promise.reject({
          type: 'TaskNotFound' as const,
          message: `Task with ID "${args.taskId}" not found`
        }));
      }

      // Store previous status for response
      const previousStatus = targetTask.status.type;
      
      // Determine target status from parameter
      const newStatus = args.targetStatus === 'Reviewed'
        ? PrTaskStatus.reviewed()
        : args.targetStatus === 'Refined'
          ? PrTaskStatus.refined()
          : PrTaskStatus.toBeRefined();

      // Validate status transition
      if (!PrTaskStatus.canTransition(targetTask.status, newStatus)) {
        return ResultAsync.fromSafePromise(Promise.reject({
          type: 'InvalidTransition' as const,
          message: `Cannot transition from ${PrTaskStatus.toString(targetTask.status)} to ${PrTaskStatus.toString(newStatus)}`
        }));
      }

      // Apply status update using domain logic
      const updateResult = PrTask.applyUpdate(targetTask, { status: newStatus });
      if (updateResult.isErr()) {
        const errors = updateResult.error;
        return ResultAsync.fromSafePromise(Promise.reject({
          type: 'ValidationError' as const,
          message: errors.map(e => e.message).join('; ')
        }));
      }

      const updatedTask = updateResult.value;
      
      // Update the plan with the reviewed task
      const updatedTasks = plan.tasks.map(task => 
        task.id === args.taskId ? updatedTask : task
      );
      
      const updatedPlan = {
        ...plan,
        tasks: updatedTasks,
        updatedAt: new Date()
      };

      // Save the updated plan and return response
      return savePlan(updatedPlan)
        .mapErr(storageError => ({ type: 'StorageError' as const, message: `Failed to save plan: ${storageError.message}` }))
        .map(() => ({ updatedTask, previousStatus }));
    })
    .match(
      ({ updatedTask, previousStatus }) => {
        const response = taskToReviewResponse(updatedTask, previousStatus);
        return toCallToolResult([nextAction(updatedTask.title, updatedTask.status.type), JSON.stringify(response, null, 2)], false);
      },
      error => toCallToolResult([`Failed to review task: ${error.message}`], true)
    );
};