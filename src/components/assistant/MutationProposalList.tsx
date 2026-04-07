"use client";

import { Button } from "@/components/ui/button";

export type MutationProposalRow = {
  id: string;
  tool_name: string;
  summary: string;
  created_at: string;
};

type ConfirmState = { id: string; action: "approve" | "reject" } | null;

interface Props {
  proposals: MutationProposalRow[];
  confirming: ConfirmState;
  sending: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function MutationProposalList({
  proposals,
  confirming,
  sending,
  onApprove,
  onReject,
}: Props) {
  if (proposals.length === 0) return null;

  return (
    <div className="mb-3 space-y-2">
      <p className="text-xs font-medium text-amber-200/90">
        Pending changes — approve or reject
      </p>
      {proposals.map((p) => (
        <div
          key={p.id}
          className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm"
        >
          <p className="text-xs text-neutral-500">
            {p.tool_name.replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-neutral-100">{p.summary}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="success"
              size="sm"
              disabled={confirming !== null || sending}
              loading={
                confirming?.id === p.id && confirming?.action === "approve"
              }
              onClick={() => onApprove(p.id)}
            >
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={confirming !== null || sending}
              loading={
                confirming?.id === p.id && confirming?.action === "reject"
              }
              onClick={() => onReject(p.id)}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
