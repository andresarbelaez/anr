import { createServerSupabaseClient } from "@/lib/supabase/server";
import { continueAgentChat } from "@/lib/agent/process-chat";
import { takeRateLimit } from "@/lib/utils/simple-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  request: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await context.params;
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

  let body: { outcomeMessage?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const outcomeMessage =
    typeof body.outcomeMessage === "string" ? body.outcomeMessage.trim() : "";
  if (!outcomeMessage) {
    return new Response(
      JSON.stringify({ error: "outcomeMessage (non-empty string) required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
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
        for await (const payload of continueAgentChat(
          supabase,
          user.id,
          threadId,
          outcomeMessage
        )) {
          send(payload);
        }
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : "Continue failed.",
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
