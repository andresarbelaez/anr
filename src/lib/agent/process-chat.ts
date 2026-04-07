import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentAttachmentRef, AgentMessage } from "@/lib/supabase/types";
import {
  buildChatMessagesForLlm,
  normalizeAttachments,
} from "@/lib/agent/build-chat-messages";
import { getAgentLlmConfig } from "@/lib/agent/env";
import { streamChatCompletion } from "@/lib/agent/llm-openai-compatible";
import { AGENT_ALL_TOOLS } from "@/lib/agent/tool-schemas";
import { executeAgentTool } from "@/lib/agent/execute-tools";
import { buildAgentSystemPrompt } from "@/lib/agent/system-prompt";
import type { OpenAIToolCall } from "@/lib/agent/llm-openai-compatible";
import { maybeRotateAssistantSession } from "@/lib/agent/assistant-conversation";

const MAX_ITERATIONS = 8;

type LlmOk = { ok: true; baseUrl: string; apiKey: string; model: string };

function mapRow(r: Record<string, unknown>): AgentMessage {
  return {
    id: r.id as string,
    thread_id: r.thread_id as string,
    role: r.role as AgentMessage["role"],
    content: (r.content as string) ?? null,
    tool_calls: r.tool_calls ?? null,
    tool_call_id: (r.tool_call_id as string) ?? null,
    attachments: normalizeAttachments(r.attachments),
    created_at: r.created_at as string,
  };
}

export type AgentSsePayload =
  | { type: "user_message"; id: string; content?: string }
  | { type: "delta"; text: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_end"; name: string; ok: boolean }
  | {
      type: "assistant_message";
      id: string;
      content: string;
      toolCalls?: OpenAIToolCall[] | null;
    }
  | { type: "error"; message: string }
  | {
      type: "mutation_proposal";
      proposalId: string;
      summary: string;
      toolName: string;
    }
  | { type: "session_rotated"; activeThreadId: string }
  | { type: "done" };

async function* runAgentToolLoop(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
  cfg: LlmOk
): AsyncGenerator<AgentSsePayload> {
  const systemPrompt = buildAgentSystemPrompt();

  for (let iterations = 0; iterations < MAX_ITERATIONS; iterations++) {
    const { data: rawRows, error: loadErr } = await supabase
      .from("agent_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(80);

    if (loadErr || !rawRows) {
      yield { type: "error", message: loadErr?.message ?? "Load failed." };
      yield { type: "done" };
      return;
    }

    const rows = rawRows.map((r) =>
      mapRow(r as unknown as Record<string, unknown>)
    );
    const messages = await buildChatMessagesForLlm(
      supabase,
      systemPrompt,
      rows
    );

    let assistantContent = "";
    let finalToolCalls: OpenAIToolCall[] | null = null;

    try {
      for await (const chunk of streamChatCompletion({
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
        model: cfg.model,
        messages,
        tools: [...AGENT_ALL_TOOLS],
      })) {
        if (chunk.type === "delta") {
          assistantContent += chunk.text;
          yield { type: "delta", text: chunk.text };
        } else if (chunk.type === "final") {
          assistantContent = chunk.content;
          finalToolCalls = chunk.toolCalls;
        }
      }
    } catch (e) {
      yield {
        type: "error",
        message: e instanceof Error ? e.message : "LLM request failed.",
      };
      yield { type: "done" };
      return;
    }

    const { data: asstRow, error: asstErr } = await supabase
      .from("agent_messages")
      .insert({
        thread_id: threadId,
        role: "assistant",
        content: assistantContent || null,
        tool_calls: finalToolCalls,
      })
      .select("id")
      .single();

    if (asstErr || !asstRow) {
      yield {
        type: "error",
        message: asstErr?.message ?? "Could not save assistant message.",
      };
      yield { type: "done" };
      return;
    }

    yield {
      type: "assistant_message",
      id: asstRow.id as string,
      content: assistantContent,
      toolCalls: finalToolCalls,
    };

    const useTools = Boolean(finalToolCalls?.length);

    if (!useTools) {
      yield { type: "done" };
      return;
    }

    for (const tc of finalToolCalls!) {
      const name = tc.function.name;
      yield { type: "tool_start", name };
      const result = await executeAgentTool(
        supabase,
        { userId, threadId },
        name,
        tc.function.arguments
      );
      if (result.proposal) {
        yield {
          type: "mutation_proposal",
          proposalId: result.proposal.id,
          summary: result.proposal.summary,
          toolName: result.proposal.toolName,
        };
      }
      let ok = true;
      try {
        const parsed = JSON.parse(result.content) as { error?: string };
        if (parsed?.error) ok = false;
      } catch {
        /* plain text */
      }
      yield { type: "tool_end", name, ok };
      await supabase.from("agent_messages").insert({
        thread_id: threadId,
        role: "tool",
        content: result.content,
        tool_call_id: tc.id,
      });
    }

    await supabase
      .from("agent_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", threadId);
  }

  yield { type: "done" };
}

export async function* runAgentChat(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
  userText: string,
  attachments: AgentAttachmentRef[]
): AsyncGenerator<AgentSsePayload> {
  const cfg = getAgentLlmConfig();
  if (!cfg.ok) {
    yield { type: "error", message: cfg.reason };
    yield { type: "done" };
    return;
  }

  const { data: thread, error: threadErr } = await supabase
    .from("agent_threads")
    .select("id, title")
    .eq("id", threadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (threadErr || !thread) {
    yield { type: "error", message: "Thread not found." };
    yield { type: "done" };
    return;
  }

  const { threadId: writableThreadId, rotated } =
    await maybeRotateAssistantSession(supabase, userId, threadId);

  if (rotated) {
    yield { type: "session_rotated", activeThreadId: writableThreadId };
  }

  const { data: insertedUser, error: insUserErr } = await supabase
    .from("agent_messages")
    .insert({
      thread_id: writableThreadId,
      role: "user",
      content: userText.trim() || null,
      attachments,
    })
    .select("id")
    .single();

  if (insUserErr || !insertedUser) {
    yield {
      type: "error",
      message: insUserErr?.message ?? "Could not save message.",
    };
    yield { type: "done" };
    return;
  }

  yield { type: "user_message", id: insertedUser.id as string };

  const { data: tipMeta } = await supabase
    .from("agent_threads")
    .select("title")
    .eq("id", writableThreadId)
    .maybeSingle();
  const tipTitle = (tipMeta?.title as string | null)?.trim() ?? "";
  if (!tipTitle && userText.trim()) {
    const title = userText.trim().slice(0, 72);
    await supabase
      .from("agent_threads")
      .update({ title })
      .eq("id", writableThreadId);
  }

  await supabase
    .from("agent_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", writableThreadId);

  yield* runAgentToolLoop(supabase, userId, writableThreadId, cfg);
}

/**
 * After the user approves a mutation in the UI, insert a short user note and run
 * another model turn so the assistant can confirm the outcome.
 */
export async function* continueAgentChat(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
  outcomeMessage: string
): AsyncGenerator<AgentSsePayload> {
  const cfg = getAgentLlmConfig();
  if (!cfg.ok) {
    yield { type: "error", message: cfg.reason };
    yield { type: "done" };
    return;
  }

  const { data: thread, error: threadErr } = await supabase
    .from("agent_threads")
    .select("id")
    .eq("id", threadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (threadErr || !thread) {
    yield { type: "error", message: "Thread not found." };
    yield { type: "done" };
    return;
  }

  const { threadId: writableThreadId, rotated } =
    await maybeRotateAssistantSession(supabase, userId, threadId);

  if (rotated) {
    yield { type: "session_rotated", activeThreadId: writableThreadId };
  }

  const note = `I approved that change in the panel. ${outcomeMessage} Please confirm briefly for me.`;

  const { data: insertedUser, error: insErr } = await supabase
    .from("agent_messages")
    .insert({
      thread_id: writableThreadId,
      role: "user",
      content: note,
      attachments: [],
    })
    .select("id")
    .single();

  if (insErr || !insertedUser) {
    yield {
      type: "error",
      message: insErr?.message ?? "Could not save continuation message.",
    };
    yield { type: "done" };
    return;
  }

  yield {
    type: "user_message",
    id: insertedUser.id as string,
    content: note,
  };

  await supabase
    .from("agent_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", writableThreadId);

  yield* runAgentToolLoop(supabase, userId, writableThreadId, cfg);
}
