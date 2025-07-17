import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Result, ok, err } from 'neverthrow';
import { ResultAsync } from 'neverthrow';

/**
 * Sample MCP Tool Implementation
 * 
 * This demonstrates the MCP Tool pattern for exposing domain operations to AI agents:
 * - Zod schema for input validation
 * - Handler function for business logic orchestration
 * - Prompt integration for AI agent guidance
 * - Response transformation for optimal AI consumption
 * - Error handling and user feedback
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Schema Definition - Input Validation with Zod
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Sub-schemas for complex nested objects
const acceptanceCriterionSchema = z.object({
  scenario: z.string().min(1, "Scenario cannot be empty"),
  given: z.array(z.string().min(1, "Given step cannot be empty"))
    .min(1, "At least one Given step is required"),
  when: z.array(z.string().min(1, "When step cannot be empty"))
    .min(1, "At least one When step is required"),
  then: z.array(z.string().min(1, "Then step cannot be empty"))
    .min(1, "At least one Then step is required")
});

const taskSchema = z.object({
  id: z.string().min(1).describe("Unique identifier for this task"),
  title: z.string().min(5).describe("Brief title of the PR task"),
  description: z.string().describe("Detailed description of what needs to be implemented"),
  dependencies: z.array(z.string()).optional().describe("Array of task IDs that must be completed before this task"),
  acceptanceCriteria: z.array(acceptanceCriterionSchema)
    .min(1, "At least one acceptance criterion is required")
    .describe("Acceptance criteria in Given-When-Then format"),
  definitionOfReady: z.array(z.string().min(1, "DoR item cannot be empty"))
    .describe("Definition of Ready checklist items")
});

// Main tool schema
const planToolZodSchema = z.object({
  name: z.string().min(3).describe("Name of the development plan"),
  featureBranch: z.string().min(1).describe("Feature branch name"),
  originWorktreePath: z.string().min(1).describe("Path to the origin worktree where the feature branch exists"),
  evolvingPRDPath: z.string().min(1).describe("Path to the evolving PRD document"),
  evolvingDesignDocPath: z.string().min(1).describe("Path to the evolving design document"),
  description: z.string().optional().describe("Optional description of the overall plan"),
  tasks: z.array(taskSchema).describe("Array of PR tasks to be included in the plan")
});

// Type inference from schema
export type PlanToolParameters = z.infer<typeof planToolZodSchema>;
export const planParams = planToolZodSchema.shape; // SDK required format

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Response Schema - Output Optimization for AI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type PlanToolResponse = {
  id: string;
  name: string;
  featureBranch: string;
  originWorktreePath: string;
  evolvingPRDPath: string;
  evolvingDesignDocPath: string;
  description?: string;
  // Tasks are organized by execution lines for parallel processing
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
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Domain Types - Mock domain types for this example
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type WorkPlan = {
  id: string;
  name: string;
  featureBranch: string;
  originWorktreePath: string;
  evolvingPRDPath: string;
  evolvingDesignDocPath: string;
  description?: string;
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
};

type Task = {
  id: string;
  title: string;
  description: string;
  branch: string;
  worktree: string;
  status: { type: string };
  dependencies: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  definitionOfReady: string[];
  assignedWorktree?: string;
};

type AcceptanceCriterion = {
  id: string;
  scenario: string;
  given: string[];
  when: string[];
  then: string[];
  isCompleted: boolean;
  createdAt: Date;
};

type LineView = {
  id: string;
  name: string;
  tasks: Task[];
};

type PlanView = {
  plan: WorkPlan;
  lines: LineView[];
};

type PlanEvent = {
  type: 'PlanCreated';
  planId: string;
  plan: WorkPlan;
};

type PlanError = {
  type: 'ValidationFailed' | 'PlanNotFound' | 'InvalidStateTransition';
  message: string;
};

type StorageError = {
  type: 'FileNotFound' | 'PermissionDenied' | 'NetworkError';
  message: string;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mock Domain Layer Integration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Mock command aggregate
const PlanAggregate = {
  createPlan: (params: any): Result<PlanEvent, PlanError> => {
    // Simulate domain validation and processing
    if (!params.name || params.name.length < 3) {
      return err({
        type: 'ValidationFailed',
        message: 'Plan name must be at least 3 characters'
      });
    }
    
    if (!params.tasks || params.tasks.length === 0) {
      return err({
        type: 'ValidationFailed',
        message: 'Plan must have at least one task'
      });
    }
    
    // Create mock plan
    const plan: WorkPlan = {
      id: `plan-${Date.now()}`,
      name: params.name,
      featureBranch: params.featureBranch,
      originWorktreePath: params.originWorktreePath,
      evolvingPRDPath: params.evolvingPRDPath,
      evolvingDesignDocPath: params.evolvingDesignDocPath,
      description: params.description,
      tasks: params.tasks.map((task: any, index: number) => ({
        id: `task-${index}`,
        title: task.title,
        description: task.description,
        branch: `feature/${task.id}`,
        worktree: '',
        status: { type: 'ToBeRefined' },
        dependencies: task.dependencies || [],
        acceptanceCriteria: task.acceptanceCriteria.map((criterion: any, idx: number) => ({
          id: `criterion-${idx}`,
          scenario: criterion.scenario,
          given: criterion.given,
          when: criterion.when,
          then: criterion.then,
          isCompleted: false,
          createdAt: new Date()
        })),
        definitionOfReady: task.definitionOfReady
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return ok({
      type: 'PlanCreated',
      planId: plan.id,
      plan
    });
  },
  
  toErrorMessage: (error: PlanError): string => {
    return `${error.type}: ${error.message}`;
  }
} as const;

// Mock read model queries
const planViewQueries = {
  fromPlan: (plan: WorkPlan): PlanView => {
    // Group tasks by branch to create execution lines
    const tasksByBranch = plan.tasks.reduce((acc, task) => {
      if (!acc[task.branch]) {
        acc[task.branch] = [];
      }
      acc[task.branch].push(task);
      return acc;
    }, {} as Record<string, Task[]>);
    
    const lines: LineView[] = Object.entries(tasksByBranch).map(([branch, tasks], index) => ({
      id: `line-${index}`,
      name: branch,
      tasks
    }));
    
    return {
      plan,
      lines
    };
  }
} as const;

// Mock storage operations
const savePlan = (plan: WorkPlan): ResultAsync<void, StorageError> => {
  // Simulate async storage operation
  return ResultAsync.fromPromise(
    Promise.resolve().then(() => {
      // Simulate potential storage failure
      if (Math.random() > 0.95) {
        throw new Error('Storage temporarily unavailable');
      }
      console.log(`Plan saved: ${plan.id}`);
    }),
    error => ({
      type: 'NetworkError' as const,
      message: (error as Error).message
    })
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Response Transformation - Domain to API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const planViewToResponse = (view: PlanView): PlanToolResponse => {
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
    }))
  };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Prompt Integration - AI Agent Guidance
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const nextAction = `
You MUST do the following step next:
    1. Visualize the current plan for users as a single execution-line diagram in Mermaid.
    2. In your personal worktree, branch off your working branch from the feature branch and switch to it.
       You have to do it!: \`git switch -c <your-branch-name>\`
    3. Assign yourself the task that best fits your role.
`;

export const toolDescription = `
As a tech lead with deep expertise in BDD and event-centric Domain-Driven Design, craft a finely sliced implementation roadmap
made up of bite-sized pull requests designed to maximize developer parallelism—
the smaller each PR, the better.
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Handler Implementation - Business Logic Orchestration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const planEntryPoint = (args: PlanToolParameters): Promise<CallToolResult> => {
  // Step 1: Execute domain command
  const commandResult = PlanAggregate.createPlan({
    name: args.name,
    featureBranch: args.featureBranch,
    originWorktreePath: args.originWorktreePath,
    evolvingPRDPath: args.evolvingPRDPath,
    evolvingDesignDocPath: args.evolvingDesignDocPath,
    description: args.description,
    tasks: args.tasks.map(task => ({
      ...task,
      dependencies: task.dependencies || []
    }))
  }).mapErr(error => ({ 
    type: 'CommandError' as const, 
    message: PlanAggregate.toErrorMessage(error) 
  }));
  
  // Step 2: Handle result with functional composition
  return commandResult.match(
    // Success path: Save plan and build response
    event => savePlan(event.plan)
      .mapErr(storageError => ({ 
        type: 'StorageError' as const, 
        message: `${storageError.type} - ${storageError.message}` 
      }))
      .map(() => event)
      .andThen(event => 
        ResultAsync.fromPromise(
          Promise.resolve().then(() => {
            // Step 3: Create read model view
            const planView = planViewQueries.fromPlan(event.plan);
            
            // Step 4: Transform to API response
            const response = planViewToResponse(planView);
            
            // Step 5: Combine guidance with data
            return [nextAction, JSON.stringify(response, null, 2)] as const;
          }),
          error => ({ 
            type: 'ViewError' as const, 
            message: `Failed to build response: ${(error as Error).message}` 
          })
        )
      )
      .match(
        // Success: Return formatted response
        messages => toCallToolResult([...messages], false),
        // Error: Return error message
        error => toCallToolResult([`Failed to create plan: ${error.message}`], true)
      ),
    // Error path: Return command error
    error => Promise.resolve(toCallToolResult([`Failed to create plan: ${error.message}`], true))
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Utility Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const toCallToolResult = (
  messages: string[],
  isError: boolean,
): CallToolResult => {
  return {
    content: messages.map(message =>
      ({ type: "text" as const, text: message })
    ),
    isError,
  };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tool Definition - MCP Tool Interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const planTool = {
  name: 'plan',
  description: toolDescription,
  parameters: planParams,
  handler: planEntryPoint,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Usage Examples
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/*
// Example tool usage by AI agent
const toolResult = await planTool.handler({
  name: "User Authentication Feature",
  featureBranch: "feature/user-auth",
  originWorktreePath: "/project/main",
  evolvingPRDPath: "/docs/prd/user-auth.md",
  evolvingDesignDocPath: "/docs/design/user-auth.md",
  description: "Implement comprehensive user authentication system",
  tasks: [
    {
      id: "auth-001",
      title: "Implement OAuth2 flow",
      description: "Add OAuth2 authentication with Google and GitHub providers",
      dependencies: [],
      acceptanceCriteria: [
        {
          scenario: "User can authenticate with Google",
          given: ["User has a Google account", "OAuth2 is configured"],
          when: ["User clicks 'Sign in with Google'"],
          then: ["User is authenticated", "User is redirected to dashboard"]
        }
      ],
      definitionOfReady: [
        "OAuth2 providers are configured",
        "Security requirements are reviewed",
        "API endpoints are designed"
      ]
    },
    {
      id: "auth-002",
      title: "Implement user session management",
      description: "Add secure session handling and token refresh",
      dependencies: ["auth-001"],
      acceptanceCriteria: [
        {
          scenario: "User session is maintained securely",
          given: ["User is authenticated"],
          when: ["User navigates through the application"],
          then: ["Session remains active", "Token is refreshed automatically"]
        }
      ],
      definitionOfReady: [
        "Session storage strategy is decided",
        "Token refresh mechanism is designed"
      ]
    }
  ]
});

// The tool returns structured guidance and data for the AI agent
console.log(toolResult);
*/