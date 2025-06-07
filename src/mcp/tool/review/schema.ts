import { z } from 'zod';
import { PrTask } from '../../../domain/term/task/pr_task.js';

// --- request ---
const reviewToolZodSchema = z.object({
  taskId: z.string().min(1).describe("Unique identifier of the task to review"),
  targetStatus: z.enum(['Reviewed', 'ToBeRefined', 'Refined']).default('Reviewed').describe("Target status after review (Reviewed for approval, ToBeRefined/Refined for rejection)")
});

export type ReviewToolParameters = z.infer<typeof reviewToolZodSchema>;
export const reviewParams = reviewToolZodSchema.shape; // SDKが求める型

// --- response ---
export type ReviewToolResponse = {
  taskId: string;
  previousStatus: string;
  currentStatus: string;
  task: {
    id: string;
    title: string;
    description: string;
    branch: string;
    worktree: string;
    status: string;
    dependencies: string[];
    assignedWorktree?: string;
  };
};

export const taskToReviewResponse = (task: PrTask, previousStatus: string): ReviewToolResponse => {
  return {
    taskId: task.id,
    previousStatus,
    currentStatus: task.status.type,
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      branch: task.branch,
      worktree: task.worktree,
      status: task.status.type,
      dependencies: task.dependencies,
      assignedWorktree: task.assignedWorktree
    }
  };
};