import { z } from 'zod';
import { PrTask } from '../../../domain/term/task/pr_task.js';

// --- request ---
const mergeToolZodSchema = z.object({
  taskId: z.string().min(1).describe("Unique identifier of the task to merge")
});

export type MergeToolParameters = z.infer<typeof mergeToolZodSchema>;
export const mergeParams = mergeToolZodSchema.shape; // SDKが求める型

// --- response ---
export type MergeToolResponse = {
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
  mergedAt: string;
};

export const taskToMergeResponse = (task: PrTask, previousStatus: string): MergeToolResponse => {
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
    },
    mergedAt: new Date().toISOString()
  };
};