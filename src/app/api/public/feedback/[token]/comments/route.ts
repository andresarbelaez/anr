import { NextResponse } from "next/server";
import { buildCommentTree } from "@/lib/feedback/build-comment-tree";
import { gatePublicListenRequest } from "@/lib/feedback/public-feedback-listen-guard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { FEEDBACK_TOKEN_RE } from "@/lib/feedback/feedback-token";
import {
  loadCommentsForLink,
  loadFeedbackLinkByToken,
} from "@/lib/feedback/public-session";
import {
  clientIpFromRequest,
  takeRateLimit,
} from "@/lib/utils/simple-rate-limit";

const WRITE_LIMIT = 40;
const WRITE_WINDOW_MS = 3600_000;

function isUuid(s: string) {
  return FEEDBACK_TOKEN_RE.test(s);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const gated = await gatePublicListenRequest(request, token, "comments");
    if (!gated.ok) return gated.response;

    const rows = await loadCommentsForLink(
      gated.data.linkId,
      gated.data.admin
    );
    const comments = buildCommentTree(rows);

    return NextResponse.json({ comments });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not load comments." },
      { status: 503 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
  const { token } = await context.params;
  if (!FEEDBACK_TOKEN_RE.test(token)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const ip = clientIpFromRequest(request);
  const rl = takeRateLimit(
    `fb-write:${ip}:${token}`,
    WRITE_LIMIT,
    WRITE_WINDOW_MS
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

  const b = body as Record<string, unknown>;
  const rawBody = typeof b.body === "string" ? b.body : "";
  const trimmedBody = rawBody.trim();
  if (trimmedBody.length < 1 || trimmedBody.length > 2000) {
    return NextResponse.json(
      { error: "Comment must be 1–2000 characters." },
      { status: 400 }
    );
  }

  let displayName: string | null = null;
  if (typeof b.displayName === "string") {
    const t = b.displayName.trim();
    if (t.length > 80) {
      return NextResponse.json(
        { error: "Display name is too long (max 80)." },
        { status: 400 }
      );
    }
    displayName = t.length ? t : null;
  }

  if (!displayName) {
    return NextResponse.json(
      { error: "Name is required." },
      { status: 400 }
    );
  }

  const parentId =
    b.parentId === null || b.parentId === undefined
      ? null
      : typeof b.parentId === "string"
        ? b.parentId
        : null;

  if (parentId !== null && !isUuid(parentId)) {
    return NextResponse.json({ error: "Invalid parent." }, { status: 400 });
  }

  const giverSecret =
    typeof b.giverSecret === "string" && isUuid(b.giverSecret)
      ? b.giverSecret
      : null;
  if (!giverSecret) {
    return NextResponse.json(
      { error: "Missing or invalid giverSecret (UUID)." },
      { status: 400 }
    );
  }

  let secondsIntoTrack: number | null = null;
  if (parentId === null) {
    const s = b.secondsIntoTrack;
    if (typeof s !== "number" || !Number.isFinite(s) || s < 0) {
      return NextResponse.json(
        { error: "Top-level comments require a valid secondsIntoTrack ≥ 0." },
        { status: 400 }
      );
    }
    secondsIntoTrack = s;
  } else if (b.secondsIntoTrack !== undefined && b.secondsIntoTrack !== null) {
    return NextResponse.json(
      { error: "Replies must not include a timestamp." },
      { status: 400 }
    );
  }

  const link = await loadFeedbackLinkByToken(token);
  if (!link) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!link.enabled) {
    return NextResponse.json(
      { error: "This feedback link is disabled." },
      { status: 403 }
    );
  }

  const admin = createAdminSupabaseClient();

  if (parentId) {
    const { data: parent, error: pErr } = await admin
      .from("feedback_comments")
      .select("id, feedback_link_id, parent_id")
      .eq("id", parentId)
      .maybeSingle();

    if (pErr || !parent || parent.feedback_link_id !== link.id) {
      return NextResponse.json({ error: "Invalid parent." }, { status: 400 });
    }
    if (parent.parent_id !== null) {
      return NextResponse.json(
        { error: "You can only reply to a top-level comment." },
        { status: 400 }
      );
    }
  }

  const { data: inserted, error: insErr } = await admin
    .from("feedback_comments")
    .insert({
      feedback_link_id: link.id,
      parent_id: parentId,
      body: trimmedBody,
      seconds_into_track: secondsIntoTrack,
      display_name: displayName,
      giver_secret: giverSecret,
    })
    .select("id, body, display_name, seconds_into_track, parent_id, created_at")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? "Could not save comment." },
      { status: 400 }
    );
  }

  const row = inserted as {
    id: string;
    body: string;
    display_name: string | null;
    seconds_into_track: number | null;
    parent_id: string | null;
    created_at: string;
  };

  if (row.parent_id === null) {
    return NextResponse.json({
      comment: {
        id: row.id,
        body: row.body,
        displayName: row.display_name,
        createdAt: row.created_at,
        secondsIntoTrack: row.seconds_into_track ?? 0,
        replies: [],
      },
    });
  }

  return NextResponse.json({
    reply: {
      id: row.id,
      body: row.body,
      displayName: row.display_name,
      createdAt: row.created_at,
    },
  });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not save comment." },
      { status: 503 }
    );
  }
}
