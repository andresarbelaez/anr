export type AgentLlmTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | ChatContentPart[] }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type OpenAIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ToolChunk = {
  index: number;
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
};

class ToolCallMerger {
  private byIndex = new Map<
    number,
    { id?: string; name?: string; arguments: string }
  >();

  add(chunks: ToolChunk[] | undefined) {
    if (!chunks) return;
    for (const c of chunks) {
      let e = this.byIndex.get(c.index);
      if (!e) {
        e = { arguments: "" };
        this.byIndex.set(c.index, e);
      }
      if (c.id) e.id = c.id;
      if (c.function?.name) e.name = c.function.name;
      if (c.function?.arguments) e.arguments += c.function.arguments;
    }
  }

  finish(): OpenAIToolCall[] | null {
    if (this.byIndex.size === 0) return null;
    const sorted = [...this.byIndex.entries()].sort((a, b) => a[0] - b[0]);
    const out: OpenAIToolCall[] = sorted.map(([i, e]) => ({
      id: e.id || `call_${i}`,
      type: "function" as const,
      function: {
        name: e.name || "",
        arguments: e.arguments,
      },
    }));
    return out.filter((x) => x.function.name);
  }
}

export type StreamYield =
  | { type: "delta"; text: string }
  | {
      type: "final";
      content: string;
      toolCalls: OpenAIToolCall[] | null;
      finishReason: string | null;
    };

export async function* streamChatCompletion(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  tools?: readonly AgentLlmTool[];
}): AsyncGenerator<StreamYield> {
  const url = `${params.baseUrl}/chat/completions`;
  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    stream: true,
    temperature: 0.4,
  };
  if (params.tools?.length) {
    body.tools = params.tools;
    body.tool_choice = "auto";
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `LLM HTTP ${res.status}: ${errText.slice(0, 500)}`
    );
  }

  if (!res.body) throw new Error("LLM response has no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  const merger = new ToolCallMerger();
  let finishReason: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      let json: {
        choices?: Array<{
          finish_reason?: string | null;
          delta?: {
            content?: string | null;
            tool_calls?: ToolChunk[];
          };
        }>;
      };
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }
      const choice = json.choices?.[0];
      if (!choice) continue;
      if (choice.finish_reason) finishReason = choice.finish_reason;
      const d = choice.delta;
      if (d?.content) {
        fullContent += d.content;
        yield { type: "delta", text: d.content };
      }
      if (d?.tool_calls) merger.add(d.tool_calls);
    }
  }

  const toolCalls = merger.finish();
  yield {
    type: "final",
    content: fullContent,
    toolCalls: toolCalls?.length ? toolCalls : null,
    finishReason,
  };
}
