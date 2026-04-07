import type { SupabaseClient } from "@supabase/supabase-js";

/** Rotate to a fresh backend session when the active thread has this many message rows. */
export const ASSISTANT_MESSAGES_BEFORE_ROTATE = 48;

const SUMMARY_PULL_ROWS = 32;
const SUMMARY_MAX_CHARS = 8_000;

type MsgRow = {
  role: string;
  content: string | null;
  tool_call_id: string | null;
};

/**
 * Walk `previous_thread_id` links from the active tip back to the oldest session.
 * Returns thread UUIDs in chronological order (oldest → newest) for merged history.
 */
export async function getAssistantThreadChainOldestFirst(
  supabase: SupabaseClient,
  tipThreadId: string
): Promise<string[]> {
  const orderedNewestFirst: string[] = [];
  const seen = new Set<string>();
  let cur: string | null = tipThreadId;

  while (cur && !seen.has(cur)) {
    seen.add(cur);
    orderedNewestFirst.push(cur);
    const { data, error } = await supabase
      .from("agent_threads")
      .select("previous_thread_id")
      .eq("id", cur)
      .maybeSingle();

    if (error || !data) break;
    const prev = data.previous_thread_id as string | null;
    cur = prev && prev.length ? prev : null;
  }

  return orderedNewestFirst.slice().reverse();
}

export async function fetchMergedAssistantMessages(
  supabase: SupabaseClient,
  activeThreadId: string
): Promise<Record<string, unknown>[]> {
  const chain = await getAssistantThreadChainOldestFirst(
    supabase,
    activeThreadId
  );
  if (chain.length === 0) return [];

  const { data, error } = await supabase
    .from("agent_messages")
    .select("*")
    .in("thread_id", chain)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as Record<string, unknown>[];
}

export async function fetchPendingProposalsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<
  {
    id: string;
    tool_name: string;
    summary: string;
    status: string;
    created_at: string;
  }[]
> {
  const { data, error } = await supabase
    .from("agent_mutation_proposals")
    .select("id, tool_name, summary, status, created_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as {
    id: string;
    tool_name: string;
    summary: string;
    status: string;
    created_at: string;
  }[];
}

/**
 * Ensures `assistant_conversation_state` points at a valid thread (migrates legacy users).
 */
export async function ensureActiveAssistantThreadId(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: state, error: stErr } = await supabase
    .from("assistant_conversation_state")
    .select("active_thread_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!stErr && state?.active_thread_id) {
    const tid = state.active_thread_id as string;
    const { data: ok } = await supabase
      .from("agent_threads")
      .select("id")
      .eq("id", tid)
      .eq("user_id", userId)
      .maybeSingle();
    if (ok?.id) return tid;
  }

  const { data: latest } = await supabase
    .from("agent_threads")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.id) {
    const tid = latest.id as string;
    await supabase.from("assistant_conversation_state").upsert(
      {
        user_id: userId,
        active_thread_id: tid,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    return tid;
  }

  const { data: created, error: insErr } = await supabase
    .from("agent_threads")
    .insert({ user_id: userId, title: null })
    .select("id")
    .single();

  if (insErr || !created?.id) {
    throw new Error(insErr?.message ?? "Could not create assistant thread.");
  }

  const newId = created.id as string;
  await supabase.from("assistant_conversation_state").upsert(
    {
      user_id: userId,
      active_thread_id: newId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return newId;
}

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function buildSessionHandoffSummary(rows: MsgRow[]): string {
  const lines: string[] = [];
  let total = 0;
  for (const r of rows) {
    if (total > SUMMARY_MAX_CHARS) break;
    const role = r.role;
    if (role === "tool") {
      const preview = clip((r.content ?? "").replace(/\s+/g, " ").trim(), 400);
      const line = `[tool result${r.tool_call_id ? ` ${r.tool_call_id.slice(0, 8)}` : ""}]: ${preview || "(empty)"}`;
      lines.push(line);
      total += line.length + 1;
      continue;
    }
    if (role !== "user" && role !== "assistant") continue;
    const label = role === "user" ? "User" : "Assistant";
    const body = clip((r.content ?? "").trim(), 1200);
    if (!body) continue;
    const line = `${label}: ${body}`;
    lines.push(line);
    total += line.length + 1;
  }
  return lines.join("\n\n");
}

export type RotateResult = { threadId: string; rotated: boolean };

/**
 * If the active session is too long, start a new thread with a text handoff and move the pointer.
 * Always returns the thread id where the next user message should be stored.
 */
export async function maybeRotateAssistantSession(
  supabase: SupabaseClient,
  userId: string,
  activeThreadId: string
): Promise<RotateResult> {
  const { count, error: cErr } = await supabase
    .from("agent_messages")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", activeThreadId);

  if (cErr || count === null) {
    return { threadId: activeThreadId, rotated: false };
  }

  if (count < ASSISTANT_MESSAGES_BEFORE_ROTATE) {
    return { threadId: activeThreadId, rotated: false };
  }

  const { data: threadMeta } = await supabase
    .from("agent_threads")
    .select("title")
    .eq("id", activeThreadId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: rawRows } = await supabase
    .from("agent_messages")
    .select("role, content, tool_call_id")
    .eq("thread_id", activeThreadId)
    .order("created_at", { ascending: false })
    .limit(SUMMARY_PULL_ROWS);

  const chronological = (rawRows as MsgRow[] | null)?.slice().reverse() ?? [];
  const summaryBody = buildSessionHandoffSummary(chronological);
  const handoff =
    "## Continuity (earlier messages in this conversation)\n\n" +
    (summaryBody ||
      "(No text retained — continue helping the same artist as before.)") +
    "\n\n---\nYou are still the same sidestage assistant in one continuous chat; " +
    "the UI does not show session boundaries.";

  const title = (threadMeta?.title as string | null) ?? null;

  const { data: newThread, error: tErr } = await supabase
    .from("agent_threads")
    .insert({
      user_id: userId,
      title,
      previous_thread_id: activeThreadId,
    })
    .select("id")
    .single();

  if (tErr || !newThread?.id) {
    return { threadId: activeThreadId, rotated: false };
  }

  const newId = newThread.id as string;

  const { error: mErr } = await supabase.from("agent_messages").insert({
    thread_id: newId,
    role: "user",
    content: handoff,
    attachments: [],
  });

  if (mErr) {
    await supabase.from("agent_threads").delete().eq("id", newId);
    return { threadId: activeThreadId, rotated: false };
  }

  await supabase.from("assistant_conversation_state").upsert(
    {
      user_id: userId,
      active_thread_id: newId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  await supabase
    .from("agent_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", newId);

  return { threadId: newId, rotated: true };
}
