import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Result, ResultAsync } from 'neverthrow';
import { RefinementToolParameters, RefinementToolResponse } from './schema.js';
import { nextAction } from "./prompt.js";
import { toCallToolResult } from '../util.js';
import { TaskAggregate, RefineTaskCommand } from '../../../domain/command/task/aggregate.js';
import { loadCurrentPlan, savePlan } from '../../../effect/storage/planStorage.js';
import { PrTaskStatus } from '../../../domain/term/task/status.js';
import { PrTask } from '../../../domain/term/task/pr_task.js';
import { WorkPlan } from '../../../domain/term/plan/work_plan.js';
import { ID } from '../../../common/primitive.js';


type HandlerError = {
  type: 'PlanNotFound' | 'StorageError' | 'RefinementError';
  message: string;
};

const createCommand = (plan: WorkPlan, args: RefinementToolParameters): RefineTaskCommand => ({
  planId: ID.value(plan.id),
  taskId: args.taskId,
  updates: {
    title: args.title,
    description: args.description,
    acceptanceCriteria: args.acceptanceCriteria,
    definitionOfReady: args.definitionOfReady,
    dependencies: args.dependencies
  }
});

const executeRefinement = (plan: WorkPlan, command: RefineTaskCommand): Result<WorkPlan, HandlerError> =>
  TaskAggregate.refineTask(plan, command)
    .map(({ updatedPlan }) => updatedPlan)
    .mapErr(error => ({ 
      type: 'RefinementError' as const, 
      message: TaskAggregate.toRefinementErrorMessage(error) 
    }));

const findTaskById = (plan: WorkPlan, taskId: string): PrTask | undefined =>
  plan.tasks.find(t => ID.value(t.id) === taskId);

const buildResponse = (task: PrTask): RefinementToolResponse => ({
  taskId: ID.value(task.id),
  title: task.title,
  description: task.description,
  status: PrTaskStatus.toString(task.status),
  acceptanceCriteria: task.acceptanceCriteria.map(criterion => ({
    scenario: criterion.scenario,
    given: [...criterion.given],
    when: [...criterion.when],
    then: [...criterion.then]
  })),
  definitionOfReady: [...task.definitionOfReady],
  dependencies: task.dependencies.map(dep => ID.value(dep))
});

const buildSuccessMessages = (task: PrTask): readonly [string, string] => ([
  nextAction(task.title),
  JSON.stringify(buildResponse(task), null, 2)
]);

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

      const command = createCommand(plan, args);
      const refinementResult = executeRefinement(plan, command);
      
      if (refinementResult.isErr()) {
        return ResultAsync.fromSafePromise(Promise.reject(refinementResult.error));
      }

      const updatedPlan = refinementResult.value;

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
          return buildSuccessMessages(updatedTask);
        });
    })
    .match(
      ([nextAction, jsonResponse]) => toCallToolResult([nextAction, jsonResponse], false),
      error => toCallToolResult([`Failed to refine task: ${error.message}`], true)
    );
};