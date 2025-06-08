// =============================================================================
// Master Plan Read Model - Minimal Exports (Only Used Code)
// =============================================================================

// Only export what is actually used
export type { PlanView, TrackingPlanView } from './types.js';

// Plan tool compatibility
import { planViewQueries } from './queries.js';
export const planViewQueries_legacy = planViewQueries;

// Track tool  
export { trackViewQueries } from './queries.js';