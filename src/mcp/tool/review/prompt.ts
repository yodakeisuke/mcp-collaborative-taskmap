export const reviewToolDescription = `
As a seasoned QA engineer, incorporate the review findings—mark the review complete if everything checks out; otherwise, roll the status back.
`;

export const nextAction = (taskTitle: string, currentStatus: string): string => {
  if (currentStatus === 'Reviewed') {
    return `Task "${taskTitle}" has been approved in review. Consider running QA tests or proceeding to merge.`;
  } else {
    return `Task "${taskTitle}" has been moved to ${currentStatus} status. Address the review feedback and update the implementation.`;
  }
};