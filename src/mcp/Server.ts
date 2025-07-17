import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';


export function createServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-xxx',
    version: '0.0.1',
    description: `
    `,
  });

  const tools = [
  ];

  tools.forEach(tool => {
      server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: tool.parameters,
          outputSchema: tool.outputSchema.shape,
        },
        tool.handler
      );

  });

  return server;
}