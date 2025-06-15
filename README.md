# MCP Collaborative TaskMap

[![npm version](https://badge.fury.io/js/mcp-collaborative-taskmap.svg)](https://badge.fury.io/js/mcp-collaborative-taskmap)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP (Model Context Protocol) server combined with React frontend for collaborative task mapping and parallel development orchestration. Designed for solo developers managing multiple AI coding agents working in parallel across different feature branches.

## 🚀 Quick Start

### Instant Launch with NPX

```bash
npx mcp-collaborative-taskmap
```

This command launches:
- **MCP Server**: stdio communication with Claude/AI agents
- **Express Server**: React frontend delivery (port: 3737) *(planned feature - UI under development)*

### Stop Servers

```bash
# Press Ctrl+C in terminal
^C

# Or force kill from another terminal
pkill -f mcp-collaborative-taskmap
```

## 🎯 What Problem Does This Solve?

When running multiple AI coding agents in parallel (Cursor, Claude Code, GPT-Dev, etc.), developers face:

- **Progress Visibility**: Hard to track which agent is working on what
- **Conflict Prevention**: Duplicate implementations and merge conflicts
- **Optimal Parallelism**: Don't know the ideal number of agents to run simultaneously
- **Task Coordination**: No central coordination between agents

## 💡 Solution Overview

`mcp-collaborative-taskmap` acts as a **Multi-agent Control Point (MCP)** providing:

1. **Central Progress Store**: Tracks completed/remaining tasks, assigned agents, and worktrees
2. **Agent Sync Tools**: Coding agents push/pull status via MCP tool calls
3. **Real-time Tracking**: PM agents and humans get one-shot visibility into entire development pipeline
4. **Git Worktree Integration**: Natural integration with existing Git workflows

## 🛠️ MCP Tools

The server exposes these MCP tools for AI agents:

### 🧠 `plan`
- **Purpose**: Create/update master development plans optimized for maximum parallelism
- **Users**: PM agents for master planning, coding agents for ticket creation
- **Features**: Bulk plan updates, task redefinition, PR-based planning

### 👤 `assign`
- **Purpose**: Assign work to agents or enable self-assignment
- **Users**: PM agents for assignment, coding agents for self-assignment
- **Features**: Task assignment, responsibility delegation, autonomous task selection

### 📊 `track`
- **Purpose**: Monitor progress and analyze parallelization opportunities
- **Users**: PM agents for status checks, coding agents for situational awareness
- **Features**: Plan overview, parallel capacity analysis, task dependency mapping

### 🔄 `progress`
- **Purpose**: Update task status and content
- **Users**: Coding agents for status updates, PM agents for plan adjustments
- **Features**: Task state transitions, progress tracking

### 🔍 `refinement`
- **Purpose**: Elaborate and refine task details
- **Users**: All agents for task clarification
- **Features**: Acceptance criteria definition, task decomposition

### 👀 `review`
- **Purpose**: Manage code review process
- **Users**: Coding agents for review requests, PM agents for review coordination
- **Features**: Review status tracking, feedback integration

### 🔀 `merge`
- **Purpose**: Coordinate branch merging and integration
- **Users**: All agents for merge coordination
- **Features**: Merge conflict prevention, integration sequencing

## 📋 Task Status Flow

Tasks follow a strict PR-based lifecycle:

```
Investigation → InProgress → Review → Done
     ↓              ↓           ↓
   Blocked      Blocked     Blocked
     ↓              ↓           ↓
 Abandoned    Abandoned   Abandoned
```

## 🏗️ Project Structure

```
mcp-collaborative-taskmap/
├── src/                    # MCP server source code
│   ├── domain/            # Domain-driven design layers
│   │   ├── command/       # Commands that produce events
│   │   ├── read/          # Read models/projections
│   │   └── term/          # Domain vocabulary
│   ├── mcp/               # MCP tool implementations
│   └── effect/            # Infrastructure layer
├── human-ui/              # React frontend
│   ├── src/
│   ├── package.json
│   └── ...
├── bin/
│   └── start.js          # NPX startup script
├── dist/                 # Built MCP server
└── package.json
```

## 🏛️ Architecture

```
mcp-collaborative-taskmap
├── MCP Server (stdio)
│   ├── Tool: plan - Plan creation & management
│   ├── Tool: track - Progress tracking & parallel analysis
│   ├── Tool: assign - Worktree assignment
│   ├── Tool: refinement - Task elaboration
│   ├── Tool: progress - Progress updates
│   ├── Tool: review - Review management
│   └── Tool: merge - Merge coordination
│
└── Express Server (port 3737)
    ├── /api/health → Health check
    ├── /assets/* → React static files
    └── /* → index.html (SPA fallback)
```

## 🛠️ Tech Stack

### MCP Server
- TypeScript
- Model Context Protocol SDK
- Node.js
- Neverthrow (Functional error handling)
- Event-driven architecture

### Frontend
- React 18
- TypeScript
- Vite (Build tool)
- Jotai (State management)
- Tailwind CSS (Styling)
- Radix UI (UI components)

## 📝 Development

### Prerequisites

```bash
# Install dependencies
npm install
cd human-ui && npm install
```

### Development Scripts

```bash
# Start both servers in development mode
npm run dev:both

# Individual startup
npm run dev              # MCP server only
npm run dev:frontend     # Frontend only

# Build
npm run build           # Full build
npm run build:frontend  # Frontend only

# Testing & Quality
npm run lint            # ESLint
npm run typecheck       # TypeScript check
npm run test            # Run tests
```

### Environment Variables

```bash
# Port configuration (optional)
MCP_PORT=3737           # MCP server port (default)
```

## 🚀 Usage with AI Agents

### Claude Code Integration

Add to your Claude Code configuration:

```json
{
  "mcpServers": {
    "collaborative-taskmap": {
      "command": "npx",
      "args": ["mcp-collaborative-taskmap"]
    }
  }
}
```

### Cursor Integration

Configure in Cursor settings to use MCP tools for task coordination.

### General MCP Client

Any MCP-compatible client can connect via stdio:

```bash
npx mcp-collaborative-taskmap
```

## 🔄 Git Worktree Workflow

The system is designed to work seamlessly with Git worktrees for parallel development:

```bash
# Create dedicated worktree for each task
git worktree add ../<task-dir> <branch-name>
cd ../<task-dir> && claude

# Clean up when done
git worktree remove ../<task-dir>
```

## 🎯 Domain-Driven Design

The codebase follows strict DDD principles:

- **Event-Centric**: Commands produce events, not side effects
- **Functional**: Complete rejection of class-based OOP
- **Ubiquitous Language**: Code as domain knowledge documentation
- **Composition**: One business rule = one function

## 📦 NPM Distribution

Available as `mcp-collaborative-taskmap` on npm:

```bash
npx mcp-collaborative-taskmap
```

## 🤝 Contributing

We welcome pull requests and issue reports. Please follow the existing code style and domain-driven design principles.

### Development Guidelines

- Use functional programming patterns
- Follow the existing domain structure
- Write tests for new functionality
- Ensure TypeScript type safety

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Projects

- [Model Context Protocol](https://github.com/modelcontextprotocol/protocol)
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Cursor](https://cursor.sh/)

---

**Built for the age of AI-assisted development** 🤖✨