import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ResultAsync } from 'neverthrow';
import { AssignToolParameters, taskToAssignResponse } from './schema.js';
import { nextAction } from './prompt.js';
import { toCallToolResult } from '../util.js';
import { PrTask } from '../../../domain/term/task/pr_task.js';
import { loadCurrentPlan, savePlan } from '../../../effect/storage/planStorage.js';

export const assignEntryPoint = (args: AssignToolParameters): Promise<CallToolResult> => {
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

      // Assign the worktree using domain logic
      const assignResult = PrTask.assignWorktree(targetTask, args.worktreeName);
      if (assignResult.isErr()) {
        const errors = assignResult.error;
        return ResultAsync.fromSafePromise(Promise.reject({
          type: 'ValidationError' as const,
          message: errors.map(e => e.message).join('; ')
        }));
      }

      const updatedTask = assignResult.value;
      
      // Update the plan with the assigned task
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
        .map(() => updatedTask);
    })
    .match(
      updatedTask => {
        const response = taskToAssignResponse(updatedTask);
        return toCallToolResult([nextAction, JSON.stringify(response, null, 2)], false);
      },
      error => toCallToolResult([`Failed to assign task: ${error.message}`], true)
    );
};