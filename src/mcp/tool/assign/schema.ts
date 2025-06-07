import { z } from 'zod';
import { PrTask } from '../../../domain/term/task/pr_task.js';

// --- request ---
const assignToolZodSchema = z.object({
  taskId: z.string().min(1).describe("Unique identifier of the task to assign"),
  worktreeName: z.string().min(1).describe("Name of the worktree to assign to this task")
});

export type AssignToolParameters = z.infer<typeof assignToolZodSchema>;
export const assignParams = assignToolZodSchema.shape; // SDKが求める型

// --- response ---
export type AssignToolResponse = {
  taskId: string;
  assignedWorktree: string;
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

export const taskToAssignResponse = (task: PrTask): AssignToolResponse => {
  return {
    taskId: task.id,
    assignedWorktree: task.assignedWorktree || '',
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