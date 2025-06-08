import { progressParams } from './schema.js';
import { progressEntryPoint } from './handler.js';
import { toolDescription } from './prompt.js';

export const progressTool = {
  name: 'progress',
  description: toolDescription,
  parameters: progressParams,
  handler: progressEntryPoint,
};