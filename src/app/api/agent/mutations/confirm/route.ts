import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveMutationProposal } from "@/lib/agent/mutation-proposals";
import { takeRateLimit } from "@/lib/utils/simple-rate-limit";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = takeRateLimit(`agent-mutation-confirm:${user.id}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      }
    );
  }

  let body: { proposalId?: string; action?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const proposalId = typeof body.proposalId === "string" ? body.proposalId.trim() : "";
  const action =
    body.action === "approve" || body.action === "reject" ? body.action : null;

  if (!proposalId || !action) {
    return NextResponse.json(
      { error: "proposalId and action (approve | reject) required." },
      { status: 400 }
    );
  }

  const result = await resolveMutationProposal(supabase, user.id, proposalId, action);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Failed" },
      { status: result.error === "Forbidden" ? 403 : 400 }
    );
  }

  return NextResponse.json({ ok: true, message: result.message });
}
