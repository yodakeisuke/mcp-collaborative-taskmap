export const nextAction = (taskName: string) => `
You MUST take the following steps next:
1. Pause and confirm that your refinements are sound and that the implementation plan is crystal-clear.
2. If everything checks out, proceed with implementing ${taskName}.`


export const toolDescription = `As a product engineer committed to delivering user value, 
I refine the task's details, acceptance criteria, and Definition of Ready—
and I often have to revisit them while the work is already in progress.`