"use client";

import { useEffect, useState } from "react";
import { LogOut, X } from "lucide-react";
import { S } from "@/components/studio/ui/s";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/** Match `StudioDonateModal` — above viewport chips (5200). */
const MODAL_Z = 5300;

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called when the user confirms; typically sign out + navigate. */
  onConfirm: () => void | Promise<void>;
};

export function StudioSignOutConfirmModal({
  open,
  onClose,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: MODAL_Z }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-sign-out-title"
    >
      <Button
        type="button"
        variant="bare"
        disabled={busy}
        className="absolute inset-0 h-full min-h-full w-full cursor-pointer bg-[rgba(28,18,8,0.58)] hover:bg-[rgba(28,18,8,0.58)] disabled:cursor-wait"
        aria-label="Close dialog"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        className="relative z-10 w-full max-w-sm rounded-lg border p-5 pt-4 shadow-xl"
        style={{
          background: S.surface,
          borderColor: S.border,
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
        }}
      >
        <Button
          type="button"
          variant="bare"
          disabled={busy}
          className="absolute right-2 top-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#8a6040] transition-colors hover:bg-black/[0.06] hover:text-[#5a3518] focus-visible:ring-2 focus-visible:ring-[#d4b896]/80 disabled:opacity-50"
          aria-label="Close"
          onClick={onClose}
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
        </Button>

        <div className="flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border"
            style={{
              background: "rgba(90,53,24,0.08)",
              borderColor: S.border,
            }}
          >
            <LogOut
              className="h-6 w-6"
              style={{ color: S.textSecondary }}
              strokeWidth={2}
            />
          </div>
          <h2
            id="studio-sign-out-title"
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: S.textPrimary,
            }}
          >
            Sign out?
          </h2>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 12,
              color: S.textMuted,
              lineHeight: 1.55,
              maxWidth: 260,
            }}
          >
            You&apos;ll need to sign in again to open your studio and manage
            your work.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outlineSoft"
            size="sm"
            disabled={busy}
            className={cn(
              "!rounded-sm !border-[#d4b896] !text-xs !font-medium text-[#5a3518]"
            )}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={busy}
            className="!rounded-sm !border-[#a82820] !text-xs !font-semibold !text-[#a82820] hover:!bg-[rgba(168,40,32,0.10)]"
            onClick={() => void handleConfirm()}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
