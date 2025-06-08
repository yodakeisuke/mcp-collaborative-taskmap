import { WorkPlan } from '../../term/plan/work_plan.js';
import { PlanEvent } from '../../command/plan/events.js';
import { PrTask } from '../../term/task/pr_task.js';
import { StatusCompletionCheck } from '../../term/task/status.js';
import { 
  LineView, 
  LineId, 
  LineState, 
  LineExecutability,
  CorePlanStats, 
  ParallelExecutionStats 
} from './types.js';

// =============================================================================
// Event Projections (Minimal)
// =============================================================================

export const projectPlanFromEvents = (events: PlanEvent[]): WorkPlan | null => {
  let currentPlan: WorkPlan | null = null;
  
  for (const event of events) {
    switch (event.type) {
      case 'PlanCreated':
        currentPlan = event.plan;
        break;
      case 'PlanUpdated':
        currentPlan = event.plan;
        break;
      case 'TaskStatusChanged':
        if (currentPlan) {
          currentPlan = updateTaskStatusInPlan(currentPlan, event.taskId, event.newStatus);
        }
        break;
      case 'TasksAdded':
        if (currentPlan) {
          currentPlan = addTasksToPlan(currentPlan, event.taskIds);
        }
        break;
      case 'DependenciesChanged':
        if (currentPlan) {
          currentPlan = updateTaskDependenciesInPlan(currentPlan, event.taskId, event.newDeps);
        }
        break;
      default:
        throw new Error(`Unhandled event type: ${event satisfies never}`);
    }
  }
  
  return currentPlan;
};

// =============================================================================
// Line Projections (Minimal)
// =============================================================================

export const deriveLineViewsFromPlan = (plan: WorkPlan): LineView[] => {
  const tasksByBranch = groupTasksByBranch(plan.tasks);
  const lines = createLinesFromTaskGroups(tasksByBranch);
  const linesWithDependencies = calculateLineDependencies(lines, plan.tasks);
  
  return linesWithDependencies.map(line => enrichLineWithAnalysis(line));
};

export const calculateLineExecutability = (
  line: LineView, 
  allLines: readonly LineView[]
): LineExecutability => {
  const completedDependencies = line.dependencies.filter(depId =>
    allLines.find(l => l.id === depId)?.state.type === 'Completed'
  );
  
  const isExecutable = completedDependencies.length === line.dependencies.length &&
                      line.state.type !== 'Completed' &&
                      line.state.type !== 'Abandoned';
  
  const isAssigned = line.tasks.some(task => task.assignedWorktree);
  const isCompleted = line.state.type === 'Completed';
  
  const blockedBy = line.dependencies.filter(depId =>
    allLines.find(l => l.id === depId)?.state.type !== 'Completed'
  );
  
  return {
    isExecutable,
    isAssigned,
    isCompleted,
    blockedBy
  };
};

export const isLineCompleted = (line: LineView): boolean => {
  if (line.tasks.length === 0) return false;
  return line.tasks.every(task => StatusCompletionCheck.isCompleted(task.status));
};

export const isLineExecutable = (line: LineView, completedLines: Set<LineId>): boolean => {
  if (completedLines.has(line.id)) return false;
  return line.dependencies.every(depId => completedLines.has(depId));
};

export const isLineUnassigned = (line: LineView): boolean => {
  if (line.tasks.length === 0) return true;
  return line.tasks.every(task => !task.assignedWorktree);
};

export const getCompletedLineIds = (lines: readonly LineView[]): Set<LineId> => {
  return new Set(
    lines
      .filter(line => isLineCompleted(line))
      .map(line => line.id)
  );
};

// =============================================================================
// Stats Projections (Minimal)
// =============================================================================

export const calculateCorePlanStats = (plan: WorkPlan, lines: readonly LineView[]): CorePlanStats => {
  const tasksByStatus: Record<string, number> = {
    'ToBeRefined': 0,
    'Refined': 0,
    'Implemented': 0,
    'Reviewed': 0,
    'Merged': 0,
    'Blocked': 0,
    'Abandoned': 0
  };
  const tasksByBranch: Record<string, number> = {};

  for (const task of plan.tasks) {
    tasksByStatus[task.status.type] = (tasksByStatus[task.status.type] || 0) + 1;
    tasksByBranch[task.branch] = (tasksByBranch[task.branch] || 0) + 1;
  }

  return {
    totalTasks: plan.tasks.length,
    totalLines: lines.length,
    tasksByStatus,
    tasksByBranch
  };
};

export const calculateParallelExecutionStats = (lines: readonly LineView[]): ParallelExecutionStats => {
  const completedLines = getCompletedLineIds(lines);
  
  const executableLines = lines.filter(line => 
    isLineExecutable(line, completedLines)
  );
  
  const unassignedLines = lines.filter(line => 
    isLineUnassigned(line)
  );
  
  const executableUnassignedLines = executableLines.filter(line => 
    isLineUnassigned(line)
  );
  
  const blockedLines = lines.filter(line => 
    line.state.type === 'Blocked' || 
    (line.dependencies.length > 0 && !isLineExecutable(line, completedLines))
  );

  return {
    executableLines: executableLines.length,
    unassignedLines: unassignedLines.length,
    executableUnassignedLines: executableUnassignedLines.length,
    blockedLines: blockedLines.length,
    completedLines: completedLines.size
  };
};

// =============================================================================
// Helper Functions
// =============================================================================

const updateTaskStatusInPlan = (plan: WorkPlan, taskId: string, newStatus: string): WorkPlan => {
  const updatedTasks = plan.tasks.map(task => {
    if (task.id.toString() === taskId) {
      const status = { type: newStatus } as any;
      return { ...task, status, updatedAt: new Date() };
    }
    return task;
  });

  return {
    ...plan,
    tasks: updatedTasks,
    updatedAt: new Date()
  };
};

const addTasksToPlan = (plan: WorkPlan, taskIds: string[]): WorkPlan => {
  return {
    ...plan,
    updatedAt: new Date()
  };
};

const updateTaskDependenciesInPlan = (plan: WorkPlan, taskId: string, newDeps: string[]): WorkPlan => {
  const updatedTasks = plan.tasks.map(task => {
    if (task.id.toString() === taskId) {
      const dependencies = newDeps as any;
      return { ...task, dependencies, updatedAt: new Date() };
    }
    return task;
  });

  return {
    ...plan,
    tasks: updatedTasks,
    updatedAt: new Date()
  };
};

const groupTasksByBranch = (tasks: readonly PrTask[]): Map<string, PrTask[]> => {
  const tasksByBranch = new Map<string, PrTask[]>();
  
  for (const task of tasks) {
    const tasks = tasksByBranch.get(task.branch) || [];
    tasks.push(task);
    tasksByBranch.set(task.branch, tasks);
  }
  
  return tasksByBranch;
};

const createLinesFromTaskGroups = (tasksByBranch: Map<string, PrTask[]>): LineView[] => {
  const lines: LineView[] = [];
  
  for (const [branch, tasks] of tasksByBranch) {
    const lineId = LineId.generate();
    
    lines.push({
      id: lineId,
      name: branch,
      branch,
      tasks,
      dependencies: [],
      state: { type: 'NotStarted' },
      executability: {
        isExecutable: false,
        isAssigned: false,
        isCompleted: false,
        blockedBy: []
      }
    });
  }
  
  return lines;
};

const calculateLineDependencies = (lines: LineView[], allTasks: readonly PrTask[]): LineView[] => {
  const branchToLineId = new Map<string, LineId>();
  
  for (const line of lines) {
    branchToLineId.set(line.branch, line.id);
  }
  
  return lines.map(line => {
    const lineDeps = new Set<LineId>();
    
    for (const task of line.tasks) {
      for (const depTaskId of task.dependencies) {
        const depTask = allTasks.find(t => t.id === depTaskId);
        if (depTask && depTask.branch !== line.branch) {
          const depLineId = branchToLineId.get(depTask.branch);
          if (depLineId) {
            lineDeps.add(depLineId);
          }
        }
      }
    }
    
    return {
      ...line,
      dependencies: Array.from(lineDeps)
    };
  });
};

const enrichLineWithAnalysis = (line: LineView): LineView => {
  const state = calculateLineState(line.tasks);
  
  return {
    ...line,
    state
  };
};

const calculateLineState = (tasks: readonly PrTask[]): LineState => {
  if (tasks.length === 0) {
    return { type: 'NotStarted' };
  }
  
  const completedTasks = tasks.filter(task => StatusCompletionCheck.isCompleted(task.status));
  const abandonedTasks = tasks.filter(task => task.status.type === 'Abandoned');
  const blockedTasks = tasks.filter(task => task.status.type === 'Blocked');
  
  if (completedTasks.length === tasks.length) {
    return { type: 'Completed' };
  }
  
  if (abandonedTasks.length > 0) {
    return { type: 'Abandoned' };
  }
  
  if (blockedTasks.length > 0) {
    return { type: 'Blocked' };
  }
  
  const startedTasks = tasks.filter(task => 
    task.status.type !== 'ToBeRefined' && task.status.type !== 'Refined'
  );
  
  if (startedTasks.length > 0) {
    return { type: 'InProgress' };
  }
  
  return { type: 'NotStarted' };
};