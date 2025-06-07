import { refinementParams } from './schema.js';
import { refinementEntryPoint } from './handler.js';
import { toolDescription } from './prompt.js';

export const refinementTool = {
  name: 'refine',
  description: toolDescription,
  parameters: refinementParams,
  handler: refinementEntryPoint,
};