"use client";

import { useEffect, useState } from "react";
import { CrmNewContactForm } from "@/components/crm/CrmNewContactForm";
import { STUDIO_NEUTRAL_BRIDGE_CSS } from "@/components/studio/ui/studio-neutral-bridge-css";
import { S } from "@/components/studio/ui/s";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (contactId: string) => void | Promise<void>;
};

export function StudioNewCrmContactModal({ open, onClose, onCreated }: Props) {
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormKey((k) => k + 1);
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2400] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-new-crm-contact-title"
    >
      <button
        type="button"
        disabled={saving}
        className="absolute inset-0 border-0"
        style={{
          background: "rgba(28,18,8,0.58)",
          cursor: saving ? "default" : "pointer",
        }}
        aria-label="Close dialog"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border shadow-xl"
        style={{
          background: S.surface,
          borderColor: S.border,
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
        }}
      >
        <div
          className="shrink-0 border-b px-5 py-3"
          style={{ borderColor: S.border }}
        >
          <h2
            id="studio-new-crm-contact-title"
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: S.textPrimary,
            }}
          >
            New contact
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 11,
              color: S.textMuted,
              lineHeight: 1.45,
            }}
          >
            Add collaborations now or later — links go to releases or library
            songs.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <style>{STUDIO_NEUTRAL_BRIDGE_CSS}</style>
          <div className="studio-neutral-bridge">
            <CrmNewContactForm
              key={formKey}
              showTitle={false}
              onBusyChange={setSaving}
              onCancel={onClose}
              onSuccess={async (id) => {
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
