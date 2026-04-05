import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: thread, error: tErr } = await supabase
    .from("agent_threads")
    .select("id")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (tErr || !thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("agent_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}
