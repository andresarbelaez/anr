"use client";

import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { S } from "@/components/studio/ui/s";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  songTitle: string;
  /** Full row label (including appended file type), e.g. `Radio edit.mp3`. */
  versionLabel: string;
  busy?: boolean;
};

export function CatalogVersionDownloadModal({
  open,
  onClose,
  onConfirm,
  songTitle,
  versionLabel,
  busy = false,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[5300] bg-[rgba(28,18,8,0.45)] hover:bg-[rgba(28,18,8,0.45)]"
        className="z-[5301] w-full max-w-sm gap-0 border p-5 pt-4 sm:max-w-sm"
        style={{
          background: S.surface,
          borderColor: S.border,
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
        }}
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
            className="absolute right-2 top-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#8a6040] transition-colors hover:bg-black/[0.06] hover:text-[#5a3518] focus-visible:ring-2 focus-visible:ring-[#d4b896]/80 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </Button>
        </DialogClose>

        <div className="flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border"
            style={{
              background: "rgba(90,53,24,0.08)",
              borderColor: S.border,
            }}
          >
            <Download
              className="h-6 w-6"
              strokeWidth={2}
              style={{ color: S.accent }}
            />
          </div>
          <DialogTitle
            className="m-0 px-6 text-[17px] font-bold leading-snug"
            style={{ color: S.textPrimary }}
          >
            Download this version?
          </DialogTitle>
          <DialogDescription asChild>
            <p
              className="mx-auto mt-2.5 max-w-[280px] text-xs leading-snug"
              style={{ color: S.textMuted }}
            >
              <span className="font-medium" style={{ color: S.textSecondary }}>
                {songTitle}
              </span>
              <span aria-hidden="true"> · </span>
              {versionLabel}
            </p>
          </DialogDescription>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outlineSoft"
            size="sm"
            disabled={busy}
            className="!rounded-sm !border-[#d4b896] !text-xs !font-medium text-[#5a3518]"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="studioMicroappPrimary"
            loading={busy}
            onClick={() => void onConfirm()}
          >
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
