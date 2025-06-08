import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { planTool } from './tool/plan/index.js';
import { refinementTool } from './tool/refinement/index.js';
import { assignTool } from './tool/assign/index.js';
import { reviewTool } from './tool/review/index.js';
import { mergeTool } from './tool/merge/index.js';
import { progressTool } from './tool/progress/index.js';
import { trackTool } from './tool/track/index.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-worktree',
    version: '0.0.1',
  });

  const tools = [
    planTool,
    trackTool,
    assignTool,
    refinementTool,
    progressTool,
    reviewTool,
    mergeTool,
  ];

  tools.forEach(tool => {
    server.tool(
      tool.name,
      tool.description,
      tool.parameters,
      tool.handler
    );
  });

  return server;
}