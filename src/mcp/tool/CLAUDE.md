# MCP Tool Implementation Guide for AI Agents

This guide provides essential patterns for implementing **MCP Tools** that expose domain operations to AI agents through the Model Context Protocol.

## Core Philosophy

> "MCPツールは、ドメインロジックをAIエージェントに安全に公開するためのインターフェイス層です"

MCP Tools serve as the bridge between AI agents and domain logic:
- **Schema-First Design**: Define clear input/output contracts
- **Domain Integration**: Orchestrate domain operations safely
- **AI-Optimized Responses**: Structure data for optimal AI consumption
- **Error Handling**: Provide meaningful feedback to AI agents
- **Prompt Integration**: Guide AI agents through multi-step workflows

## Quick Reference

When implementing a new MCP tool:

1. **Define Zod schema** for input validation in `schema.ts`
2. **Implement handler function** for business logic orchestration in `handler.ts`
3. **Create prompt strings** for AI agent guidance in `prompt.ts`
4. **Export tool definition** in `index.ts`
5. **Add response transformation** functions for API optimization

常に、上記1~5の全てが必要というわけではない。必要なもののみ作成すること。

Always refer to the sample code and production examples for concrete implementations of these patterns.

## Sample Code Reference

### Complete MCP Tool Implementation
- **File**: [`./src/mcp/tool/_sample-code/mcp-tool-example.ts`](./_sample-code/mcp-tool-example.ts)
- **Purpose**: Demonstrates complete MCP tool patterns
- **Key concepts**: Schema design, handler orchestration, prompt integration, response transformation

### Production Reference
- **Directory**: [`./src/mcp/tool/plan/`](./plan/)
- **Files**: 
  - [`schema.ts`](./plan/schema.ts) - Input/output schema definition
  - [`handler.ts`](./plan/handler.ts) - Business logic orchestration
  - [`prompt.ts`](./plan/prompt.ts) - AI agent guidance
  - [`index.ts`](./plan/index.ts) - Tool export definition

## Implementation Patterns

### 1. Schema-First Design

Define clear contracts using Zod:

```typescript
// Sub-schemas for complex nested structures
const acceptanceCriterionSchema = z.object({
  scenario: z.string().min(1, "Scenario cannot be empty"),
  given: z.array(z.string().min(1, "Given step cannot be empty"))
    .min(1, "At least one Given step is required"),
  when: z.array(z.string().min(1, "When step cannot be empty"))
    .min(1, "At least one When step is required"),
  then: z.array(z.string().min(1, "Then step cannot be empty"))
    .min(1, "At least one Then step is required")
});

// Main tool schema
const planToolZodSchema = z.object({
  name: z.string().min(3).describe("Name of the development plan"),
  featureBranch: z.string().min(1).describe("Feature branch name"),
  tasks: z.array(taskSchema).describe("Array of PR tasks to be included in the plan")
});

// Type inference and SDK format
export type PlanToolParameters = z.infer<typeof planToolZodSchema>;
export const planParams = planToolZodSchema.shape; // SDK required format
```

### 2. Handler Orchestration Pattern

Coordinate domain operations with functional composition:

```typescript
export const planEntryPoint = (args: PlanToolParameters): Promise<CallToolResult> => {
  // Step 1: Execute domain command
  const commandResult = PlanAggregate.createPlan({
    name: args.name,
    featureBranch: args.featureBranch,
    tasks: args.tasks.map(transformTask)
  }).mapErr(error => ({ 
    type: 'CommandError' as const, 
    message: PlanAggregate.toErrorMessage(error) 
  }));
  
  // Step 2: Handle result with functional composition
  return commandResult.match(
    // Success path: Save plan and build response
    event => savePlan(event.plan)
      .mapErr(mapStorageError)
      .map(() => event)
      .andThen(buildResponse)
      .match(
        messages => toCallToolResult([...messages], false),
        error => toCallToolResult([`Failed: ${error.message}`], true)
      ),
    // Error path: Return command error
    error => Promise.resolve(toCallToolResult([`Failed: ${error.message}`], true))
  );
};
```

### 3. Response Transformation Pattern

Transform domain data for optimal AI consumption:

```typescript
// Define AI-optimized response structure
export type PlanToolResponse = {
  id: string;
  name: string;
  featureBranch: string;
  // Tasks organized by execution lines for parallel processing
  lines: Array<{
    id: string;
    name: string;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      dependencies: string[];
      acceptanceCriteria: Array<{
        scenario: string;
        given: string[];
        when: string[];
        then: string[];
        isCompleted: boolean;
      }>;
    }>;
  }>;
};

// Transform domain view to API response
const planViewToResponse = (view: PlanView): PlanToolResponse => {
  return {
    id: view.plan.id,
    name: view.plan.name,
    featureBranch: view.plan.featureBranch,
    lines: view.lines.map(line => ({
      id: line.id,
      name: line.name,
      tasks: line.tasks.map(transformTaskForAPI)
    }))
  };
};
```

### 4. Prompt Integration Pattern

Guide AI agents through multi-step workflows:

```typescript
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

// Combine guidance with data in handler
const response = planViewToResponse(planView);
return [nextAction, JSON.stringify(response, null, 2)] as const;
```

### 5. Error Handling Pattern

Provide meaningful feedback to AI agents:

```typescript
// Error type mapping
type ToolError = 
  | { type: 'CommandError'; message: string }
  | { type: 'StorageError'; message: string }
  | { type: 'ViewError'; message: string };

// Error transformation
const mapStorageError = (storageError: StorageError): ToolError => ({ 
  type: 'StorageError' as const, 
  message: `${storageError.type} - ${storageError.message}` 
});

// Error response utility
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
```

## Tool Structure Guidelines

### Schema Module (`schema.ts`)
```typescript
// Input validation schemas
export const toolZodSchema = z.object({
  // Tool parameters
});

export type ToolParameters = z.infer<typeof toolZodSchema>;
export const toolParams = toolZodSchema.shape;

// Response type definition
export type ToolResponse = {
  // Response structure optimized for AI consumption
};

// Response transformation function
export const transformResponse = (domainData: DomainType): ToolResponse => {
  // Transform domain data to API format
};
```

### Handler Module (`handler.ts`)
```typescript
export const toolEntryPoint = (args: ToolParameters): Promise<CallToolResult> => {
  // Step 1: Execute domain operations
  // Step 2: Handle side effects (storage, external APIs)
  // Step 3: Build response with prompts
  // Step 4: Return formatted result
};
```

### Prompt Module (`prompt.ts`)
```typescript
export const nextAction = `
Instructions for AI agent next steps...
`;

export const toolDescription = `
Role-based description for AI agent context...
`;
```

### Index Module (`index.ts`)
```typescript
export const toolName = {
  name: 'tool-name',
  description: toolDescription,
  parameters: toolParams,
  handler: toolEntryPoint,
};
```

## Integration with Domain Layers

### Command Layer Integration
```typescript
// Use domain aggregates for business logic
const commandResult = DomainAggregate.executeCommand(params)
  .mapErr(error => ({ 
    type: 'CommandError' as const, 
    message: DomainAggregate.toErrorMessage(error) 
  }));
```

### Read Model Integration
```typescript
// Use read models for optimized queries
const view = readModelQueries.fromPlan(plan);
const response = transformViewToResponse(view);
```

### Effect Layer Integration
```typescript
// Handle side effects with Result types
const sideEffectResult = await effectOperation(data)
  .mapErr(error => ({ 
    type: 'EffectError' as const, 
    message: error.message 
  }));
```
