import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { FEEDBACK_TOKEN_RE } from "@/lib/feedback/feedback-token";
import { loadFeedbackLinkByToken } from "@/lib/feedback/public-session";
import {
  clientIpFromRequest,
  takeRateLimit,
} from "@/lib/utils/simple-rate-limit";

const DELETE_LIMIT = 30;
const DELETE_WINDOW_MS = 3600_000;

function isUuid(s: string): boolean {
  return FEEDBACK_TOKEN_RE.test(s);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ token: string; commentId: string }> }
) {
  try {
  const { token, commentId } = await context.params;
  if (!FEEDBACK_TOKEN_RE.test(token) || !isUuid(commentId)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const ip = clientIpFromRequest(request);
  const rl = takeRateLimit(
    `fb-del:${ip}:${token}`,
    DELETE_LIMIT,
    DELETE_WINDOW_MS
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests.", retryAfterSec: rl.retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const giverSecret =
    typeof (body as { giverSecret?: unknown }).giverSecret === "string" &&
    isUuid((body as { giverSecret: string }).giverSecret)
      ? (body as { giverSecret: string }).giverSecret
      : null;

  if (!giverSecret) {
    return NextResponse.json(
      { error: "Missing or invalid giverSecret." },
      { status: 400 }
    );
  }

  const link = await loadFeedbackLinkByToken(token);
  if (!link) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const admin = createAdminSupabaseClient();

  const { data: row, error: fetchErr } = await admin
    .from("feedback_comments")
    .select("id, giver_secret, feedback_link_id")
    .eq("id", commentId)
    .maybeSingle();

  if (fetchErr || !row || row.feedback_link_id !== link.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (row.giver_secret !== giverSecret) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { error: delErr } = await admin
    .from("feedback_comments")
    .delete()
    .eq("id", commentId);

  if (delErr) {
    return NextResponse.json(
      { error: "Could not delete comment." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not delete comment." },
      { status: 503 }
    );
  }
}
