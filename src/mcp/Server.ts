import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { planTool } from './tool/plan/index.js';
import { refinementTool } from './tool/refinement/index.js';
import { assignTool } from './tool/assign/index.js';
import { reviewTool } from './tool/review/index.js';
import { mergeTool } from './tool/merge/index.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-worktree',
    version: '0.0.1',
  });

  // Register the plan tool
  server.tool(
    planTool.name,
    planTool.description,
    planTool.parameters,
    planTool.handler
  );

  // Register the assign tool
  server.tool(
      assignTool.name,
      assignTool.description,
      assignTool.parameters,
      assignTool.handler
  );

  // Register the refinement tool
  server.tool(
    refinementTool.name,
    refinementTool.description,
    refinementTool.parameters,
    refinementTool.handler
  );

  // Register the review tool
  server.tool(
    reviewTool.name,
    reviewTool.description,
    reviewTool.parameters,
    reviewTool.handler
  );

  // Register the merge tool
  server.tool(
    mergeTool.name,
    mergeTool.description,
    mergeTool.parameters,
    mergeTool.handler
  );

  return server;
}