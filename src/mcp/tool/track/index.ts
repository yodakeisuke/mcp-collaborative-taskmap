import { trackParams } from './schema.js';
import { trackEntryPoint } from './handler.js';
import { toolDescription } from './prompt.js';

export const trackTool = {
  name: 'track',
  description: toolDescription,
  parameters: trackParams,
  handler: trackEntryPoint,
};