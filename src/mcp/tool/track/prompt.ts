type ClientAgent = 'claude code' | 'cursor' | 'claude' | 'その他';

const baseDiagramInstructions = {
  mermaid: "Visualize the current execution lines as a Mermaid diagram showing parallel work opportunities and dependencies.",
  ascii: "Create an ASCII-based visual representation of the execution lines showing parallel work opportunities and dependencies."
};

const baseNextAction = `
You MUST do the following step next:
You now have visibility into the current project status. Key information includes:
    1. **Parallel Execution Stats**: Shows executable lines, unassigned lines, and work available for new agents
    2. **Overall Progress**: Task status distribution across all lines
    3. **Dependency Status**: Which lines are ready for execution based on completed dependencies

Based on this tracking information, consider:
    - **PM Agents**: Use this for overall project monitoring and bottleneck identification
    - **Coding Agents**: Use parallelExecutionStats to self-assign available work from executableUnassignedLines
    - **Next Actions**: Focus on lines that are executable but unassigned for maximum parallel progress
`;

export const getNextActionForClient = (clientAgent: ClientAgent): string => {
  const shouldUseMermaid = clientAgent === 'cursor' || clientAgent === 'claude';
  const diagramInstruction = shouldUseMermaid 
    ? baseDiagramInstructions.mermaid 
    : baseDiagramInstructions.ascii;
  
  return `${baseNextAction}

**Visualization**: ${diagramInstruction}
`;
};

export const toolDescription = `As a senior developer, keep driving the implementation forward, ensuring every acceptance criterion is met—and provide granular progress updates along the way.`;