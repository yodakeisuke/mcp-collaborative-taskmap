// PrTaskStatus ADT
export type PrTaskStatus =
  | { type: 'ToBeRefined' }
  | { type: 'Refined' }
  | { type: 'Implemented' }
  | { type: 'Reviewed' }
  | { type: 'Merged' }
  | { type: 'Blocked'; reason: string; since: Date }
  | { type: 'Abandoned'; reason: string; at: Date };

export const PrTaskStatus = {
  toBeRefined: (): PrTaskStatus => ({ type: 'ToBeRefined' }),
  refined: (): PrTaskStatus => ({ type: 'Refined' }),
  implemented: (): PrTaskStatus => ({ type: 'Implemented' }),
  reviewed: (): PrTaskStatus => ({ type: 'Reviewed' }),
  merged: (): PrTaskStatus => ({ type: 'Merged' }),
  blocked: (reason: string, since?: Date): PrTaskStatus => ({ type: 'Blocked', reason, since: since ?? new Date() }),
  abandoned: (reason: string, at?: Date): PrTaskStatus => ({ type: 'Abandoned', reason, at: at ?? new Date() }),

  // Status transition validation
  canTransition: (from: PrTaskStatus, to: PrTaskStatus): boolean => {
    if (from.type === 'Merged' || from.type === 'Abandoned') {
      return false;
    }

    if (to.type === 'Blocked' || to.type === 'Abandoned') {
      return true;
    }

    // ToBeRefined and Refined are accessible from any non-terminal state
    if (to.type === 'ToBeRefined' || to.type === 'Refined') {
      return true;
    }

    const validTransitions: Record<string, string[]> = {
      'ToBeRefined': ['Refined'],
      'Refined': ['Implemented'],
      'Implemented': ['Reviewed'],
      'Reviewed': ['Merged', 'Implemented'],
      'Blocked': ['Implemented', 'Reviewed'],
    };

    return validTransitions[from.type]?.includes(to.type) ?? false;
  },

  isTerminal: (status: PrTaskStatus): boolean => {
    return status.type === 'Merged' || status.type === 'Abandoned';
  },

  toString: (status: PrTaskStatus): string => {
    switch (status.type) {
      case 'ToBeRefined':
        return 'To Be Refined';
      case 'Refined':
        return 'Refined';
      case 'Implemented':
        return 'Implemented';
      case 'Reviewed':
        return 'Reviewed';
      case 'Merged':
        return 'Merged';
      case 'Blocked':
        return `Blocked: ${status.reason}`;
      case 'Abandoned':
        return `Abandoned: ${status.reason}`;
      default:
        throw new Error(`Unknown status type: ${status satisfies never}`);
    }
  }
} as const;

export const StatusCompletionCheck = {
  isCompleted: (status: PrTaskStatus): boolean => {
    switch (status.type) {
      case 'Merged':
        return true;
      case 'ToBeRefined':
      case 'Refined':
      case 'Implemented':
      case 'Reviewed':
      case 'Blocked':
      case 'Abandoned':
        return false;
      default:
        throw new Error(`Unknown status type: ${status satisfies never}`);
    }
  }
} as const;