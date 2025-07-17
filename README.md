# MCP Server Template
A minimal typescript template for building MCP (Model Context Protocol) servers.

## Quick Start

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Start the server
npm run start
```

## Example Tool

The template includes an `example` tool that demonstrates:

```typescript
// Input
{
  "message": "hello",
  "count": 2
}

// Output
{
  "processed": "Processed: hello",
  "items": [
    { "id": "item-1", "value": "hello-1" },
    { "id": "item-2", "value": "hello-2" }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Adding New Tools

1. Create a new directory in `src/mcp/tool/your-tool/`
2. Add these files:
   - `schema.ts` - Input/output schemas
   - `handler.ts` - Tool logic
   - `index.ts` - Tool export
3. Register the tool in `src/mcp/Server.ts`

## File Structure

```
src/
├── index.ts                    # Server entry point
├── mcp/
│   ├── Server.ts              # MCP server setup
│   └── tool/
│       ├── util.ts            # Response utilities
│       ├── example/           # Example tool
│       │   ├── schema.ts      # Zod schemas
│       │   ├── handler.ts     # Tool handler
│       │   └── index.ts       # Tool export
│       └── CLAUDE.md          # Implementation guide
```

## Scripts

- `npm run dev` - Development with hot reload
- `npm run build` - Build TypeScript
- `npm run start` - Start server
- `npm run typecheck` - Type checking

## Documentation

See `src/mcp/tool/CLAUDE.md` for detailed implementation patterns.