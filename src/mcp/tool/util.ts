import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";




export const toCallToolResult = (
    messages: string[],
    isError: boolean,
): CallToolResult => {
    return {
        content: messages.map(message =>
            ({ type: "text" as const, text: message })
        ),
        isError,
    };
};