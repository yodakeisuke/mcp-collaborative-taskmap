import { WorkPlan } from '../../term/plan/work_plan.js';
import { PlanEvent } from '../../command/plan/events.js';
import { BasePlanView, TrackingPlanView, ViewConstructionConfig } from './types.js';
import {
  projectPlanFromEvents,
  deriveLineViewsFromPlan,
  calculateLineExecutability,
  calculateCorePlanStats,
  calculateParallelExecutionStats
} from './projections.js';

// =============================================================================
// Plan View Queries (Minimal)
// =============================================================================

export const createPlanViewFromPlan = (
  plan: WorkPlan, 
  config: ViewConstructionConfig = {}
): BasePlanView => {
  const lines = deriveEnrichedLines(plan);
  const filteredLines = applyLineFilters(lines, config);
  const stats = calculateCorePlanStats(plan, filteredLines);
  
  return {
    plan,
    lines: filteredLines,
    stats,
    lastUpdated: new Date()
  };
};

export const createPlanViewFromEvents = (
  events: PlanEvent[], 
  config: ViewConstructionConfig = {}
): BasePlanView | null => {
  const plan = projectPlanFromEvents(events);
  if (!plan) {
    return null;
  }
  
  return createPlanViewFromPlan(plan, config);
};

export const planViewQueries = {
  fromPlan: createPlanViewFromPlan,
  fromEvents: createPlanViewFromEvents
} as const;

// =============================================================================
// Track View Queries (Minimal)
// =============================================================================

export const createTrackViewFromPlan = (
  plan: WorkPlan, 
  config: ViewConstructionConfig = {}
): TrackingPlanView => {
  const lines = deriveEnrichedLines(plan);
  const filteredLines = applyTrackingFilters(lines, config);
  
  const coreStats = calculateCorePlanStats(plan, filteredLines);
  const parallelExecutionStats = calculateParallelExecutionStats(filteredLines);
  
  return {
    plan,
    lines: filteredLines,
    stats: {
      ...coreStats,
      parallelExecutionStats
    },
    lastUpdated: new Date()
  };
};

export const createTrackViewFromEvents = (
  events: PlanEvent[], 
  config: ViewConstructionConfig = {}
): TrackingPlanView | null => {
  const plan = projectPlanFromEvents(events);
  if (!plan) {
    return null;
  }
  
  return createTrackViewFromPlan(plan, config);
};

export const trackViewQueries = {
  fromPlan: createTrackViewFromPlan,
  fromEvents: createTrackViewFromEvents
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

const deriveEnrichedLines = (plan: WorkPlan) => {
  const basicLines = deriveLineViewsFromPlan(plan);
  
  return basicLines.map(line => ({
    ...line,
    executability: calculateLineExecutability(line, basicLines)
  }));
};

const applyLineFilters = (lines: any[], config: ViewConstructionConfig) => {
  let filteredLines = lines;
  
  if (!config.includeCompletedLines) {
    filteredLines = filteredLines.filter(line => line.state.type !== 'Completed');
  }
  
  return filteredLines;
};

const applyTrackingFilters = (lines: any[], config: ViewConstructionConfig) => {
  let filteredLines = lines;
  
  if (config.includeCompletedLines === false) {
    filteredLines = filteredLines.filter(line => line.state.type !== 'Completed');
  }
  
  return filteredLines;
};