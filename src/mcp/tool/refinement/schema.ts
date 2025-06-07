import { z } from 'zod';

// --- request ---
const acceptanceCriterionSchema = z.object({
  scenario: z.string().min(1, "Scenario cannot be empty"),
  given: z.array(z.string().min(1, "Given step cannot be empty"))
    .min(1, "At least one Given step is required"),
  when: z.array(z.string().min(1, "When step cannot be empty"))
    .min(1, "At least one When step is required"),
  then: z.array(z.string().min(1, "Then step cannot be empty"))
    .min(1, "At least one Then step is required")
});

const refinementToolZodSchema = z.object({
  taskId: z.string().min(1).describe("Unique identifier of the task to refine"),
  title: z.string().min(5).optional().describe("Updated title of the PR task"),
  description: z.string().optional().describe("Updated detailed description of what needs to be implemented"),
  acceptanceCriteria: z.array(acceptanceCriterionSchema).optional()
    .describe("Updated acceptance criteria in Given-When-Then format"),
  definitionOfReady: z.array(z.string().min(1, "DoR item cannot be empty")).optional()
    .describe("Updated Definition of Ready checklist items"),
  dependencies: z.array(z.string()).optional()
    .describe("Updated array of task IDs that must be completed before this task")
});

export type RefinementToolParameters = z.infer<typeof refinementToolZodSchema>;
export const refinementParams = refinementToolZodSchema.shape;

// --- response ---
export type RefinementToolResponse = {
  taskId: string;
  title: string;
  description: string;
  status: string;
  acceptanceCriteria: Array<{
    scenario: string;
    given: string[];
    when: string[];
    then: string[];
  }>;
  definitionOfReady: string[];
  dependencies: string[];
};