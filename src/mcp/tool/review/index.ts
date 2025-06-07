import { reviewToolDescription } from './prompt.js';
import { reviewParams } from './schema.js';
import { reviewEntryPoint } from './handler.js';

export const reviewTool = {
  name: 'review',
  description: reviewToolDescription,
  parameters: reviewParams,
  handler: reviewEntryPoint,
};