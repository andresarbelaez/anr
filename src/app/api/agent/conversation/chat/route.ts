import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensureActiveAssistantThreadId } from "@/lib/agent/assistant-conversation";
import { runAgentChat } from "@/lib/agent/process-chat";
import type { AgentAttachmentRef } from "@/lib/supabase/types";
import { takeRateLimit } from "@/lib/utils/simple-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

function isAttachmentRef(x: unknown): x is AgentAttachmentRef {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.path === "string" &&
    typeof o.mimeType === "string" &&
    (o.kind === "image" || o.kind === "audio" || o.kind === "csv")
  );
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rl = takeRateLimit(`agent-chat:${user.id}`, 30, 60_000);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Try again shortly." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rl.retryAfterSec),
        },
      }
    );
  }

  let body: { content?: string; attachments?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const content = typeof body.content === "string" ? body.content : "";
  const rawAtt = Array.isArray(body.attachments) ? body.attachments : [];
  const attachments = rawAtt.filter(isAttachmentRef);

  if (!content.trim() && attachments.length === 0) {
    return new Response(
      JSON.stringify({ error: "Message or attachment required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let activeThreadId: string;
  try {
    activeThreadId = await ensureActiveAssistantThreadId(supabase, user.id);
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Could not open conversation.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
        );
      };
      try {
        for await (const payload of runAgentChat(
          supabase,
          user.id,
          activeThreadId,
          content,
          attachments
        )) {
          send(payload);
        }
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : "Chat failed.",
        });
        send({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
