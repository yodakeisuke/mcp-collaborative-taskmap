import { z } from 'zod';
import { TrackingPlanView } from '../../../domain/read/master_plan/index.js';

// --- request ---
export const trackToolZodSchema = z.object({
  clientAgent: z.enum(['claude code', 'cursor', 'claude', 'その他'])
    .describe('クライアントエージェントの種類（プロンプト出し分けに使用）')
});
export type TrackToolParameters = z.infer<typeof trackToolZodSchema>;
export const trackParams = trackToolZodSchema.shape; // SDKが求める型

// --- response ---
export type TrackToolResponse = {
  id: string;
  name: string;
  featureBranch: string;
  originWorktreePath: string;
  evolvingPRDPath: string;
  evolvingDesignDocPath: string;
  description?: string;
  // Tasks are organized by lines for display purposes
  lines: Array<{
    id: string;
    name: string;
    tasks: Array<{
      id: string;
      title: string;
      description: string;
      worktree: string;
      status: string;
      dependencies: string[];
      acceptanceCriteria: Array<{
        id: string;
        scenario: string;
        given: string[];
        when: string[];
        then: string[];
        isCompleted: boolean;
        createdAt: string;
      }>;
      definitionOfReady: string[];
      assignedWorktree?: string;
    }>;
  }>;
  // Enhanced statistics for track tool
  stats: {
    totalTasks: number;
    totalLines: number;
    tasksByStatus: Record<string, number>;
    tasksByBranch: Record<string, number>;
    estimatedTotalHours?: number;
    parallelizableLines: number;
    criticalPathLength?: number;
    // Enhanced parallel execution statistics
    parallelExecutionStats: {
      executableLines: number;
      unassignedLines: number;
      executableUnassignedLines: number;
    };
  };
  lastUpdated: string;
};

export const trackViewToResponse = (view: TrackingPlanView): TrackToolResponse => {
  return {
    id: view.plan.id,
    name: view.plan.name,
    featureBranch: view.plan.featureBranch,
    originWorktreePath: view.plan.originWorktreePath,
    evolvingPRDPath: view.plan.evolvingPRDPath,
    evolvingDesignDocPath: view.plan.evolvingDesignDocPath,
    description: view.plan.description,
    lines: view.lines.map(line => ({
      id: line.id,
      name: line.name,
      tasks: line.tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        worktree: task.worktree,
        status: task.status.type,
        dependencies: task.dependencies,
        acceptanceCriteria: task.acceptanceCriteria.map(criterion => ({
          id: criterion.id,
          scenario: criterion.scenario,
          given: [...criterion.given],
          when: [...criterion.when],
          then: [...criterion.then],
          isCompleted: criterion.isCompleted,
          createdAt: criterion.createdAt.toISOString()
        })),
        definitionOfReady: [...task.definitionOfReady],
        assignedWorktree: task.assignedWorktree
      }))
    })),
    stats: {
      totalTasks: view.stats.totalTasks,
      totalLines: view.stats.totalLines,
      tasksByStatus: view.stats.tasksByStatus,
      tasksByBranch: view.stats.tasksByBranch,
      estimatedTotalHours: view.stats.estimatedTotalHours,
      parallelizableLines: view.stats.parallelExecutionStats.executableLines,
      criticalPathLength: undefined,
      parallelExecutionStats: {
        executableLines: view.stats.parallelExecutionStats.executableLines,
        unassignedLines: view.stats.parallelExecutionStats.unassignedLines,
        executableUnassignedLines: view.stats.parallelExecutionStats.executableUnassignedLines
      }
    },
    lastUpdated: view.lastUpdated.toISOString()
  };
};