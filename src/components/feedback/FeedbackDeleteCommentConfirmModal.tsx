"use client";

import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { S } from "@/components/studio/ui/s";

/** Above feedback micro-app chrome; align with StudioSignOutConfirmModal. */
const MODAL_Z = 5300;

type Appearance = "studio" | "dark";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  /** True when deleting a root comment (removes thread and replies). */
  deletesThread: boolean;
  busy?: boolean;
  appearance?: Appearance;
};

export function FeedbackDeleteCommentConfirmModal({
  open,
  onClose,
  onConfirm,
  deletesThread,
  busy = false,
  appearance = "dark",
}: Props) {
  if (!open) return null;

  const combinedBusy = !!busy;

  const isStudio = appearance === "studio";
  const title = deletesThread
    ? "Delete this comment?"
    : "Delete this reply?";
  const description = deletesThread
    ? "This will remove the comment and all replies. This cannot be undone."
    : "This cannot be undone.";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: MODAL_Z }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fb-delete-comment-title"
    >
      <Button
        type="button"
        variant="bare"
        disabled={combinedBusy}
        className={cn(
          "absolute inset-0 h-full min-h-full w-full cursor-pointer disabled:cursor-wait",
          isStudio
            ? "bg-[rgba(28,18,8,0.45)] hover:bg-[rgba(28,18,8,0.45)]"
            : "bg-black/70 hover:bg-black/70"
        )}
        aria-label="Close dialog"
        onClick={() => {
          if (!combinedBusy) onClose();
        }}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-sm rounded-lg border p-5 pt-4 shadow-xl",
          isStudio
            ? ""
            : "border-neutral-800 bg-neutral-950 shadow-black/40"
        )}
        style={
          isStudio
            ? {
                background: S.surface,
                borderColor: S.border,
                boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
              }
            : undefined
        }
      >
        <Button
          type="button"
          variant="bare"
          disabled={combinedBusy}
          className={cn(
            "absolute right-2 top-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 disabled:opacity-50",
            isStudio
              ? "text-[#8a6040] hover:bg-black/[0.06] hover:text-[#5a3518] focus-visible:ring-[#d4b896]/80"
              : "text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200 focus-visible:ring-neutral-600/50"
          )}
          aria-label="Close"
          onClick={onClose}
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
        </Button>

        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              "mb-3 flex h-12 w-12 items-center justify-center rounded-xl border",
              isStudio
                ? ""
                : "border-neutral-700 bg-neutral-900"
            )}
            style={
              isStudio
                ? {
                    background: "rgba(90,53,24,0.08)",
                    borderColor: S.border,
                  }
                : undefined
            }
          >
            <Trash2
              className="h-6 w-6"
              strokeWidth={2}
              style={{ color: isStudio ? S.error : "#f87171" }}
            />
          </div>
          <h2
            id="fb-delete-comment-title"
            className={cn(
              "m-0 text-[17px] font-bold",
              isStudio ? "" : "text-white"
            )}
            style={isStudio ? { color: S.textPrimary } : undefined}
          >
            {title}
          </h2>
          <p
            className={cn(
              "mx-auto mt-2.5 max-w-[260px] text-xs leading-snug",
              isStudio ? "" : "text-neutral-400"
            )}
            style={isStudio ? { color: S.textMuted } : undefined}
          >
            {description}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant={isStudio ? "outlineSoft" : "secondary"}
            size="sm"
            disabled={combinedBusy}
            className={
              isStudio
                ? cn(
                    "!rounded-sm !border-[#d4b896] !text-xs !font-medium text-[#5a3518]"
                  )
                : undefined
            }
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isStudio ? "danger" : "dangerSolid"}
            size="sm"
            loading={combinedBusy}
            className={
              isStudio
                ? "!rounded-sm !border-[#a82820] !text-xs !font-semibold !text-[#a82820] hover:!bg-[rgba(168,40,32,0.10)]"
                : undefined
            }
            onClick={() => void Promise.resolve(onConfirm())}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
