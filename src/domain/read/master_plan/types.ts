import { WorkPlan } from '../../term/plan/work_plan.js';
import { PrTask } from '../../term/task/pr_task.js';
import { ID, NonEmptyString } from '../../../common/primitive.js';
import { Result } from 'neverthrow';

// =============================================================================
// Minimal Core Types (Only Used)
// =============================================================================

export type LineId = ID<'Line'>;

export const LineId = {
  create: (value: string): Result<LineId, string> => {
    return NonEmptyString.from(value)
      .map(nes => nes.value as LineId);
  },
  generate: (): LineId => {
    return `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as LineId;
  },
  value: (id: LineId): string => ID.value(id)
} as const;

export type LineState = 
  | { type: 'NotStarted' }
  | { type: 'InProgress' }
  | { type: 'Completed' }
  | { type: 'Blocked' }
  | { type: 'Abandoned' };

export type LineExecutability = {
  isExecutable: boolean;
  isAssigned: boolean;
  isCompleted: boolean;
  blockedBy: LineId[];
};

export type LineView = {
  readonly id: LineId;
  readonly name: string;
  readonly branch: string;
  readonly tasks: readonly PrTask[];
  readonly dependencies: readonly LineId[];
  readonly state: LineState;
  readonly executability: LineExecutability;
};

// =============================================================================
// Minimal Stats Types (Only Used)
// =============================================================================

export type CorePlanStats = {
  readonly totalTasks: number;
  readonly totalLines: number;
  readonly tasksByStatus: Readonly<Record<string, number>>;
  readonly tasksByBranch: Readonly<Record<string, number>>;
  readonly estimatedTotalHours?: number;
};

export type ParallelExecutionStats = {
  readonly executableLines: number;
  readonly unassignedLines: number;
  readonly executableUnassignedLines: number;
  readonly blockedLines: number;
  readonly completedLines: number;
};

// =============================================================================
// Minimal View Types (Only Used)
// =============================================================================

export type ViewConstructionConfig = {
  readonly includeCompletedLines?: boolean;
  readonly includeDetailedStats?: boolean;
  readonly includeRecommendations?: boolean;
  readonly maxAge?: number;
  readonly cacheKey?: string;
};

export type BasePlanView = {
  readonly plan: WorkPlan;
  readonly lines: readonly LineView[];
  readonly stats: CorePlanStats;
  readonly lastUpdated: Date;
};

export type TrackingPlanView = {
  readonly plan: WorkPlan;
  readonly lines: readonly LineView[];
  readonly stats: CorePlanStats & {
    readonly parallelExecutionStats: ParallelExecutionStats;
  };
  readonly lastUpdated: Date;
};

// Legacy compatibility
export type PlanView = BasePlanView;