"use client";

import { X, ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import type { ReleaseStatus } from "@/lib/supabase/types";

const EDITABLE_STATUSES: ReleaseStatus[] = ["draft", "rejected"];

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface Props {
  open: boolean;
  releaseId: string;
  releaseTitle: string;
  releaseDate: string;
  releaseStatus: ReleaseStatus;
  onClose: () => void;
}

export function ReleaseEventDialog({
  open,
  releaseId,
  releaseTitle,
  releaseDate,
  releaseStatus,
  onClose,
}: Props) {
  if (!open) return null;

  const canEdit = EDITABLE_STATUSES.includes(releaseStatus);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Release date
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-white leading-snug">
              {releaseTitle}
            </h2>
            <p className="mt-1 text-sm text-neutral-400">{fmtDate(releaseDate)}</p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 shrink-0 text-neutral-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status badge */}
        <div className="mb-4 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              releaseStatus === "live"
                ? "bg-green-900/50 text-green-400"
                : releaseStatus === "submitted" || releaseStatus === "processing"
                  ? "bg-yellow-900/50 text-yellow-400"
                  : releaseStatus === "rejected"
                    ? "bg-red-900/50 text-red-400"
                    : "bg-neutral-800 text-neutral-400"
            }`}
          >
            {releaseStatus}
          </span>
        </div>

        {/* Info message */}
        <div className="mb-5 flex gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
          <p className="text-xs text-neutral-400 leading-relaxed">
            {canEdit
              ? "To change this date, edit the release under Releases. The calendar will update automatically."
              : `This release is ${releaseStatus} and can no longer be rescheduled here.`}
          </p>
        </div>

        {/* Action */}
        <Link
          href={`/releases/${releaseId}`}
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          View release
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
