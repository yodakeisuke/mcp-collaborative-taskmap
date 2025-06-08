import { z } from 'zod';

// --- request ---
const criteriaUpdateSchema = z.object({
  id: z.string().min(1, "Criteria ID cannot be empty")
    .describe("ID of the acceptance criterion to update"),
  completed: z.boolean()
    .describe("Check state (true: checked, false: unchecked)")
});

const progressToolZodSchema = z.object({
  taskId: z.string().min(1).describe("Unique identifier of the task to update progress"),
  criteriaUpdates: z.array(criteriaUpdateSchema)
    .min(1, "At least one criteria update is required")
    .describe("Array of acceptance criteria updates")
});

export type ProgressToolParameters = z.infer<typeof progressToolZodSchema>;
export const progressParams = progressToolZodSchema.shape;

// --- response ---
export type ProgressToolResponse = {
  nextAction: string;
  task: {
    id: string;
    title: string;
    status: string;
    acceptanceCriteria: Array<{
      id: string;
      scenario: string;
      isCompleted: boolean;
    }>;
    progress: {
      completed: number;
      total: number;
      percentage: number;
    };
  };
};