"use client";

import { CrmNewContactForm } from "@/components/crm/CrmNewContactForm";
import { STUDIO_NEUTRAL_BRIDGE_CSS } from "@/components/studio/ui/studio-neutral-bridge-css";
import { S } from "@/components/studio/ui/s";

type Props = {
  formKey: number;
  onCancel: () => void;
  onCreated: (contactId: string) => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
};

/**
 * In-window “new contact” flow for the CRM micro-app stack (replaces modal overlay).
 */
export function StudioNewCrmContactPanel({
  formKey,
  onCancel,
  onCreated,
  onBusyChange,
}: Props) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: S.bg,
        overflow: "hidden",
      }}
    >
      <div
        className="shrink-0 border-b px-5 py-3 sm:px-5"
        style={{
          borderColor: S.border,
          background: S.surface,
          flexShrink: 0,
        }}
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
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <style>{STUDIO_NEUTRAL_BRIDGE_CSS}</style>
        <div className="studio-neutral-bridge w-full min-w-0">
          <CrmNewContactForm
            key={formKey}
            showTitle={false}
            onBusyChange={onBusyChange}
            onCancel={onCancel}
            onSuccess={onCreated}
          />
        </div>
      </div>
    </div>
  );
}
