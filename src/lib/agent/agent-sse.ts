export type AgentSsePayload = {
  type: string;
  id?: string;
  content?: string;
  text?: string;
  message?: string;
  name?: string;
  proposalId?: string;
  summary?: string;
  toolName?: string;
  /** Emitted when the backend starts a new session; client should track this for refetches. */
  activeThreadId?: string;
};

/**
 * Consumes a text/event-stream style SSE body: blocks separated by `\n\n`,
 * each line `data: {...json}`.
 */
export async function drainAgentSseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onPayload: (payload: AgentSsePayload) => void
): Promise<void> {
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const blocks = buf.split("\n\n");
    buf = blocks.pop() ?? "";
    for (const block of blocks) {
      const line = block.trim();
      if (!line.startsWith("data:")) continue;
      try {
        onPayload(JSON.parse(line.slice(5).trim()) as AgentSsePayload);
      } catch {
        continue;
      }
    }
  }
  const tail = buf.trim();
  if (tail.startsWith("data:")) {
    try {
      onPayload(JSON.parse(tail.slice(5).trim()) as AgentSsePayload);
    } catch {
      /* ignore */
    }
  }
}
