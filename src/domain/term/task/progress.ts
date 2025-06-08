import { Result, ok, err } from 'neverthrow';
import { PrTask } from './pr_task.js';
import { PrTaskStatus } from './status.js';
import { AcceptanceCriterion } from './acceptance_criterion.js';

/**
 * 語彙「進捗」
 * domain type: operation
 * 
 * PRタスクの受け入れ基準の完了状態を管理し、
 * 完了状況に基づいてステータス遷移を制御する
 */

// --- modeling section ---
// state
type ProgressState =
  | ProgressUpdateRequest
  | ProgressUpdateResult
  | ProgressError[];

// eDSL
type UpdateProgress = (
  task: PrTask,
  updates: ProgressUpdateRequest
) => Result<ProgressUpdateResult, ProgressError[]>;

type ApplyCriteriaUpdates = (
  criteria: readonly AcceptanceCriterion[],
  updates: readonly CriteriaUpdate[]
) => readonly AcceptanceCriterion[];

type EvaluateCompletion = (
  criteria: readonly AcceptanceCriterion[]
) => ProgressSummary;

type DetermineStatusTransition = (
  currentStatus: PrTaskStatus,
  allCompleted: boolean
) => PrTaskStatus;

// --- data definitions ---
export type ProgressUpdateRequest = {
  readonly criteriaUpdates: readonly CriteriaUpdate[];
};

export type CriteriaUpdate = {
  readonly id: string;
  readonly completed: boolean;
};

export type ProgressUpdateResult = {
  readonly updatedTask: PrTask;
  readonly progress: ProgressSummary;
};

export type ProgressSummary = {
  readonly completed: number;
  readonly total: number;
  readonly percentage: number;
  readonly allCompleted: boolean;
};

export type ProgressError = {
  readonly type: 'InvalidStatus' | 'CriteriaNotFound';
  readonly message: string;
};

// --- implementation section ---
// workflow
const updateProgress: UpdateProgress = (task, request) => {
  const validationErrors = [
    ...mustBeInProgressableStatus(task.status),
    ...mustHaveValidCriteriaIds(task.acceptanceCriteria, request.criteriaUpdates)
  ];

  if (validationErrors.length > 0) {
    return err(validationErrors);
  }

  const updatedCriteria = applyCriteriaUpdates(
    task.acceptanceCriteria,
    request.criteriaUpdates
  );

  const progress = evaluateCompletion(updatedCriteria);
  const newStatus = determineStatusTransition(task.status, progress.allCompleted);

  const updatedTask: PrTask = {
    ...task,
    acceptanceCriteria: updatedCriteria,
    status: newStatus
  };

  return ok({ updatedTask, progress });
};

// sub tasks
const applyCriteriaUpdates: ApplyCriteriaUpdates = (criteria, updates) => {
  const updateMap = new Map(updates.map(u => [u.id, u.completed]));
  
  return criteria.map(criterion =>
    updateMap.has(criterion.id)
      ? { ...criterion, isCompleted: updateMap.get(criterion.id)! }
      : criterion
  );
};

const evaluateCompletion: EvaluateCompletion = (criteria) => {
  const total = criteria.length;
  const completed = criteria.filter(c => c.isCompleted).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allCompleted = completed === total && total > 0;

  return { completed, total, percentage, allCompleted };
};

const determineStatusTransition: DetermineStatusTransition = (currentStatus, allCompleted) => {
  const statusType = currentStatus.type;

  if (allCompleted && statusType === 'Refined') {
    return PrTaskStatus.implemented();
  }

  if (!allCompleted && (statusType === 'Implemented' || statusType === 'Reviewed')) {
    return PrTaskStatus.refined();
  }

  return currentStatus;
};

// business rules
const mustBeInProgressableStatus = (status: PrTaskStatus): ProgressError[] => {
  const validStatuses = ['Refined', 'Implemented', 'Reviewed'];
  return validStatuses.includes(status.type)
    ? []
    : [ProgressError.create(
        'InvalidStatus',
        `Cannot update progress from status ${PrTaskStatus.toString(status)}. Only Refined, Implemented, and Reviewed statuses are allowed.`
      )];
};

const mustHaveValidCriteriaIds = (
  criteria: readonly AcceptanceCriterion[],
  updates: readonly CriteriaUpdate[]
): ProgressError[] => {
  const existingIds = new Set(criteria.map(c => c.id));
  const invalidIds = updates
    .filter(update => !existingIds.has(update.id))
    .map(update => update.id);

  return invalidIds.length > 0
    ? [ProgressError.create(
        'CriteriaNotFound',
        `Acceptance criteria IDs not found: ${invalidIds.join(', ')}`
      )]
    : [];
};

// error
const ProgressError = {
  create: (type: ProgressError['type'], message: string): ProgressError => ({
    type,
    message
  })
} as const;

// --- API section ---
export const Progress = {
  update: updateProgress,
  evaluateCompletion,
  toError: ProgressError.create
} as const;