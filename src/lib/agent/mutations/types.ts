export type ToolExecutionResult = {
  content: string;
  proposal?: { id: string; summary: string; toolName: string };
};
