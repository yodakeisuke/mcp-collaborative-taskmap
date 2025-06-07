import { assignToolDescription } from './prompt.js';
import { assignParams } from './schema.js';
import { assignEntryPoint } from './handler.js';

export const assignTool = {
  name: 'assign',
  description: assignToolDescription,
  parameters: assignParams,
  handler: assignEntryPoint,
};