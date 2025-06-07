import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ResultAsync } from 'neverthrow';
import { RefinementToolParameters, RefinementToolResponse } from './schema.js';
import { toCallToolResult } from '../util.js';
import { TaskAggregate } from '../../../domain/command/task/refinement.js';
import { loadCurrentPlan, savePlan } from '../../../effect/storage/planStorage.js';
import { PrTaskStatus } from '../../../domain/term/task/status.js';
import { ID } from '../../../common/primitive.js';

export const refinementEntryPoint = (args: RefinementToolParameters): Promise<CallToolResult> => {
  return loadCurrentPlan()
    .mapErr(storageError => ({ 
      type: 'StorageError' as const, 
      message: `Failed to load plan: ${storageError.message}` 
    }))
    .andThen(plan => {
      if (!plan) {
        return ResultAsync.fromSafePromise(
          Promise.reject({ type: 'PlanNotFound' as const, message: 'No current plan found' })
        );
      }

      const command = {
        planId: ID.value(plan.id),
        taskId: args.taskId,
        updates: {
          title: args.title,
          description: args.description,
          acceptanceCriteria: args.acceptanceCriteria,
          definitionOfReady: args.definitionOfReady,
          dependencies: args.dependencies
        }
      };

      const refinementResult = TaskAggregate.refineTask(plan, command);
      
      if (refinementResult.isErr()) {
        return ResultAsync.fromSafePromise(
          Promise.reject({ 
            type: 'RefinementError' as const, 
            message: TaskAggregate.toErrorMessage(refinementResult.error) 
          })
        );
      }

      const { updatedPlan } = refinementResult.value;

      return savePlan(updatedPlan)
        .mapErr(storageError => ({ 
          type: 'StorageError' as const, 
          message: `Failed to save plan: ${storageError.message}` 
        }))
        .map(() => {
          const updatedTask = updatedPlan.tasks.find(t => ID.value(t.id) === args.taskId);
          if (!updatedTask) {
            throw new Error('Task not found after update');
          }

          const response: RefinementToolResponse = {
            taskId: ID.value(updatedTask.id),
            title: updatedTask.title,
            description: updatedTask.description,
            status: PrTaskStatus.toString(updatedTask.status),
            acceptanceCriteria: updatedTask.acceptanceCriteria.map(criterion => ({
              scenario: criterion.scenario,
              given: [...criterion.given],
              when: [...criterion.when],
              then: [...criterion.then]
            })),
            definitionOfReady: [...updatedTask.definitionOfReady],
            dependencies: updatedTask.dependencies.map(dep => ID.value(dep))
          };

          return [
            `Task "${updatedTask.title}" has been refined successfully.`,
            `Status: ${PrTaskStatus.toString(updatedTask.status)}`,
            JSON.stringify(response, null, 2)
          ] as const;
        });
    })
    .match(
      ([message1, message2, jsonResponse]) => toCallToolResult([message1, message2, jsonResponse], false),
      error => toCallToolResult([`Failed to refine task: ${error.message}`], true)
    );
};