import type { SupabaseClient } from "@supabase/supabase-js";
import { applyApprovedMutation } from "./apply-approved";
import { parseArgs } from "./helpers";
import { prepareMutationForQueue } from "./prepare-queue";
import type { ToolExecutionResult } from "./types";

export type { ToolExecutionResult };
export type { ApplyMutationResult } from "./apply-approved";

const MUTATION_NAMES = new Set([
  "update_release",
  "delete_draft_release",
  "create_release",
  "create_catalog_song",
  "update_catalog_song",
  "delete_catalog_song",
  "create_catalog_song_version",
  "update_catalog_song_version",
  "delete_catalog_song_version",
  "create_feedback_link",
  "set_feedback_link_enabled",
  "create_crm_contact",
  "update_crm_contact",
  "delete_crm_contact",
  "create_calendar_event",
  "update_calendar_event",
  "delete_calendar_event",
]);

export function isMutationTool(name: string): boolean {
  return MUTATION_NAMES.has(name);
}

export async function runMutationToolAndMaybeQueue(
  supabase: SupabaseClient,
  ctx: { userId: string; threadId: string },
  name: string,
  argsJson: string
): Promise<ToolExecutionResult> {
  const args = parseArgs(argsJson);
  if (!args) {
    return { content: JSON.stringify({ error: "Invalid tool arguments JSON" }) };
  }

  const prepared = prepareMutationForQueue(name, args, ctx);
  if (!("cleanArgs" in prepared)) {
    return { content: prepared.content };
  }

  const { cleanArgs, summary } = prepared;

  const { data: row, error } = await supabase
    .from("agent_mutation_proposals")
    .insert({
      user_id: ctx.userId,
      thread_id: ctx.threadId,
      tool_name: name,
      args: cleanArgs,
      summary,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !row) {
    return {
      content: JSON.stringify({
        error: error?.message ?? "Could not queue mutation for confirmation",
      }),
    };
  }

  const proposalId = row.id as string;
  return {
    content: JSON.stringify({
      status: "pending_confirmation",
      proposalId,
      summary,
      instruction:
        "The user must tap Approve or Reject in the assistant panel before this runs.",
    }),
    proposal: { id: proposalId, summary, toolName: name },
  };
}

export async function resolveMutationProposal(
  supabase: SupabaseClient,
  userId: string,
  proposalId: string,
  action: "approve" | "reject"
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const { data: proposal, error: loadErr } = await supabase
    .from("agent_mutation_proposals")
    .select("id, user_id, status, tool_name, args")
    .eq("id", proposalId)
    .maybeSingle();

  if (loadErr || !proposal) {
    return { ok: false, error: loadErr?.message ?? "Proposal not found" };
  }
  if (proposal.user_id !== userId) {
    return { ok: false, error: "Forbidden" };
  }
  if (proposal.status !== "pending") {
    return { ok: false, error: "This proposal was already handled." };
  }

  const now = new Date().toISOString();

  if (action === "reject") {
    const { error } = await supabase
      .from("agent_mutation_proposals")
      .update({
        status: "rejected",
        resolved_at: now,
        result_message: "Rejected by user",
      })
      .eq("id", proposalId)
      .eq("user_id", userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, message: "Rejected." };
  }

  const args = proposal.args as Record<string, unknown>;
  const result = await applyApprovedMutation(
    supabase,
    proposal.tool_name as string,
    args,
    userId
  );

  if (!result.ok) {
    await supabase
      .from("agent_mutation_proposals")
      .update({
        status: "failed",
        resolved_at: now,
        result_message: result.message,
      })
      .eq("id", proposalId)
      .eq("user_id", userId);
    return { ok: false, error: result.message };
  }

  const { error: upErr } = await supabase
    .from("agent_mutation_proposals")
    .update({
      status: "executed",
      resolved_at: now,
      result_message: result.message,
    })
    .eq("id", proposalId)
    .eq("user_id", userId);

  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true, message: result.message };
}
