"use client";

import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { S } from "@/components/studio/ui/s";
import { cn } from "@/lib/utils/cn";

type Appearance = "studio" | "dark";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called when user confirms; parent runs delete and closes the modal on success. */
  onConfirm: () => void | Promise<void>;
  songTitle: string;
  versionLabel: string;
  busy?: boolean;
  /** `studio` — warm parchment (Library micro-app). `dark` — dashboard catalog page. */
  appearance?: Appearance;
};

export function CatalogVersionDeleteModal({
  open,
  onClose,
  onConfirm,
  songTitle,
  versionLabel,
  busy = false,
  appearance = "studio",
}: Props) {
  const isStudio = appearance === "studio";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName={cn(
          "z-[5300]",
          isStudio
            ? "bg-[rgba(28,18,8,0.45)] hover:bg-[rgba(28,18,8,0.45)]"
            : "bg-black/70 hover:bg-black/70"
        )}
        className={cn(
          "z-[5301] w-full max-w-sm gap-0 border p-5 pt-4 sm:max-w-sm",
          !isStudio && "border-neutral-800 bg-neutral-950 shadow-black/40"
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
        onPointerDownOutside={(e) => {
          if (busy) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogClose asChild>
          <Button
            type="button"
            variant="bare"
            disabled={busy}
            className={cn(
              "absolute right-2 top-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 disabled:opacity-50",
              isStudio
                ? "text-[#8a6040] hover:bg-black/[0.06] hover:text-[#5a3518] focus-visible:ring-[#d4b896]/80"
                : "text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200 focus-visible:ring-neutral-600/50"
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </Button>
        </DialogClose>

        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              "mb-3 flex h-12 w-12 items-center justify-center rounded-xl border",
              !isStudio && "border-neutral-700 bg-neutral-900"
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
          <DialogTitle
            className={cn(
              "m-0 px-6 text-[17px] font-bold leading-snug",
              !isStudio && "text-white"
            )}
            style={isStudio ? { color: S.textPrimary } : undefined}
          >
            Delete &ldquo;{songTitle}&rdquo;, &ldquo;{versionLabel}&rdquo;?
          </DialogTitle>
          <DialogDescription asChild>
            <p
              className={cn(
                "mx-auto mt-2.5 max-w-[280px] text-xs leading-snug",
                !isStudio && "text-neutral-400"
              )}
              style={isStudio ? { color: S.textMuted } : undefined}
            >
              This permanently removes this audio file from your library and
              storage. This cannot be undone.
            </p>
          </DialogDescription>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant={isStudio ? "outlineSoft" : "secondary"}
            size="sm"
            disabled={busy}
            className={
              isStudio
                ? "!rounded-sm !border-[#d4b896] !text-xs !font-medium text-[#5a3518]"
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
            loading={busy}
            className={
              isStudio
                ? "!rounded-sm !border-[#a82820] !text-xs !font-semibold !text-[#a82820] hover:!bg-[rgba(168,40,32,0.10)]"
                : undefined
            }
            onClick={() => void onConfirm()}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
