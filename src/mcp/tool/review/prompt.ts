export const reviewToolDescription = `
As a seasoned QA engineer, incorporate the review findings—mark the review complete if everything checks out; otherwise, roll the status back.
`;

export const nextAction = (): string => `
Your next actions are MANDATORY:
  1. Reflect on the review and confirm whether any issues were flagged.
  2. If issues exist, reset the status and start fixing them; if everything passes, merge the work into the feature branch.
important!! 
  3. Merge your personal working branch from your worktree into the original worktree’s feature branch.
  You have to do it!: git -C [/path/to/original-worktree] merge [your work branch]
  Resolve any conflicts that arise.
`;