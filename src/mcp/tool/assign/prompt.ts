export const assignToolDescription = `
As a developer, first create the worktree, then assign yourself to the task—make sure the worktree is in place before invoking the tool.
`;

export const nextAction = `
You MUST do the following step next:
1. If you haven’t already, spin up a Git worktree for this prtTask and kick off implementation.Always make sure to do this before sending your chat response to the user.
2. In your worktree, branch off your own working branch from the feature branch.
You have to do it!: \`
    git worktree add -b <your-branch-name> worktrees/<your-branch-name>
    cd worktrees/<your-branch-name>
\`
3. 
`;