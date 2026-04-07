import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  ensureActiveAssistantThreadId,
  fetchMergedAssistantMessages,
  fetchPendingProposalsForUser,
} from "@/lib/agent/assistant-conversation";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeThreadId = await ensureActiveAssistantThreadId(
      supabase,
      user.id
    );
    const [messages, pendingProposals] = await Promise.all([
      fetchMergedAssistantMessages(supabase, activeThreadId),
      fetchPendingProposalsForUser(supabase, user.id),
    ]);

    return NextResponse.json({
      activeThreadId,
      messages,
      pendingProposals,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Load failed" },
      { status: 500 }
    );
  }
}
