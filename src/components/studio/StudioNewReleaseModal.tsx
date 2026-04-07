"use client";

import { useEffect, useState } from "react";
import { NewReleaseWizard } from "@/components/releases/NewReleaseWizard";
import { STUDIO_NEUTRAL_BRIDGE_CSS } from "@/components/studio/ui/studio-neutral-bridge-css";
import { S } from "@/components/studio/ui/s";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (releaseId: string) => void | Promise<void>;
};

export function StudioNewReleaseModal({ open, onClose, onCreated }: Props) {
  const [wizardKey, setWizardKey] = useState(0);
  const [submitBusy, setSubmitBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setWizardKey((k) => k + 1);
      setSubmitBusy(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2400] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-new-release-title"
    >
      <button
        type="button"
        disabled={submitBusy}
        className="absolute inset-0 border-0"
        style={{
          background: "rgba(28,18,8,0.58)",
          cursor: submitBusy ? "default" : "pointer",
        }}
        aria-label="Close dialog"
        onClick={() => {
          if (!submitBusy) onClose();
        }}
      />
      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border shadow-xl"
        style={{
          background: S.surface,
          borderColor: S.border,
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
        }}
      >
        <div
          className="shrink-0 border-b px-4 py-3 sm:px-5"
          style={{ borderColor: S.border }}
        >
          <h2
            id="studio-new-release-title"
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: S.textPrimary,
            }}
          >
            New release
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 11,
              color: S.textMuted,
              lineHeight: 1.45,
            }}
          >
            Add metadata, upload tracks and optional cover art, then submit for
            distribution.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          <style>{STUDIO_NEUTRAL_BRIDGE_CSS}</style>
          <div className="studio-neutral-bridge">
            <NewReleaseWizard
              key={wizardKey}
              embedded
              onBusyChange={setSubmitBusy}
              onCancel={onClose}
              onComplete={async (id) => {
                await onCreated(id);
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
