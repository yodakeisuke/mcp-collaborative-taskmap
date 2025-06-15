type ClientAgent = 'claude code' | 'cursor' | 'claude' | 'その他';

const baseDiagramInstructions = {
  mermaid: "Visualize as a Mermaid diagram",
  ascii: "Visualize as an ASCII-based visual representation."
};

const baseNextAction = `
You MUST do the following step next:
  1. Create a rich single task map that clearly visualizes the dependencies and parallel execution of PR tasks..
  2. Act fully autonomously—keep asking yourself which tasks you can start right now.
  3. “If you see a task that’s ready to start, assign it to yourself.
`;

export const getNextActionForClient = (clientAgent: ClientAgent): string => {
  const shouldUseMermaid = clientAgent === 'cursor' || clientAgent === 'claude';
  const diagramInstruction = shouldUseMermaid 
    ? baseDiagramInstructions.mermaid 
    : baseDiagramInstructions.ascii;
  
  return `
    ${baseNextAction}
    **Visualization**: ${diagramInstruction}
`;
};

export const toolDescription = `As a senior developer, keep driving the implementation forward, ensuring every acceptance criterion is met—and provide granular progress updates along the way.`;