# MCP Collaborative TaskMap

An MCP (Model Context Protocol) server combined with React frontend for collaborative task mapping and parallel development orchestration. Optimizes task mapping to maximize parallel execution across multiple AI coding agents working simultaneously on different feature branches.

## ✨ Key Features

- **⚡ Maximum Parallelization**: Task mapping optimized for maximum concurrent agent execution with dependency analysis
- **🤖 Autonomous Task Management**: Agents autonomously identify tasks to work on, create their own worktrees, and merge upon completion
- **🎯 Role-based Interventions**: PM-level oversight through Cursor, implementation-level work through Claude Code  
- **🔒 Enforced Development Practices**: Mandatory refinement, self-review, and other standard developer workflows to ensure code quality

## 🚀 Quick Start

### Instant Launch with NPX

```bash
npx mcp-collaborative-taskmap
```

This command launches:
- **MCP Server**: stdio communication with Claude/AI agents
- **Express Server**: React frontend delivery (port: 3737) *(planned feature - UI under development)*


## 🎯 What Problem Does This Solve?

When running multiple AI coding agents in parallel (Cursor, Claude Code, GPT-Dev, etc.), developers face:

- **Progress Visibility**: Hard to track which agent is working on what
- **Conflict Prevention**: Duplicate implementations and merge conflicts
- **Optimal Parallelism**: Don't know the ideal number of agents to run simultaneously
- **Task Coordination**: No central coordination between agents

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

## 📄 License

MIT License - see LICENSE file for details.