import { mergeToolDescription } from './prompt.js';
import { mergeParams } from './schema.js';
import { mergeEntryPoint } from './handler.js';

export const mergeTool = {
  name: 'merge',
  description: mergeToolDescription,
  parameters: mergeParams,
  handler: mergeEntryPoint,
};