import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ResultAsync } from 'neverthrow';
import { loadCurrentPlan } from '../../../effect/storage/planStorage.js';
import { trackViewQueries } from '../../../domain/read/master_plan/index.js';
import { toCallToolResult } from '../util.js';
import { getNextActionForClient } from './prompt.js';
import { trackViewToResponse, TrackToolParameters } from './schema.js';

export const trackEntryPoint = (args: TrackToolParameters): Promise<CallToolResult> => {
  return loadCurrentPlan()
    .mapErr((error: any) => ({ type: 'StorageError' as const, message: `${error.type} - ${error.message}` }))
    .andThen((plan: any) => 
      ResultAsync.fromPromise(
        Promise.resolve().then(() => {
          if (!plan) {
            return toCallToolResult([
              'No plan found. Please create a plan first using the plan tool.'
            ], true);
          }
          
          const trackView = trackViewQueries.fromPlan(plan);
          const response = trackViewToResponse(trackView);
          
          return toCallToolResult([
            getNextActionForClient(args.clientAgent),
            JSON.stringify(response, null, 2)
          ], false);
        }),
        (error: any) => ({ type: 'ViewError' as const, message: `Failed to build track view: ${error.message}` })
      )
    )
    .match(
      (result: any) => result,
      (error: any) => toCallToolResult([
        `Failed to load plan: ${error.message}`
      ], true)
    );
};