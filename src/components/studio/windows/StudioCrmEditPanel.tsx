"use client";

import { useCallback } from "react";
import { CrmContactEditClient } from "@/components/crm/CrmContactEditClient";
import { STUDIO_NEUTRAL_BRIDGE_CSS } from "@/components/studio/ui/studio-neutral-bridge-css";

type Props = {
  contactId: string;
  onMissingContact?: () => void;
  onDeleted?: () => void;
  onLoadedMeta?: (meta: { name: string }) => void;
};

export function StudioCrmEditPanel({
  contactId,
  onMissingContact,
  onDeleted,
  onLoadedMeta,
}: Props) {
  const onMeta = useCallback(
    (m: { name: string }) => {
      onLoadedMeta?.(m);
    },
    [onLoadedMeta]
  );

  return (
    <div
      className="studio-neutral-bridge"
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: 16,
        background: "#fdf8f0",
      }}
    >
      <style>{STUDIO_NEUTRAL_BRIDGE_CSS}</style>
      <CrmContactEditClient
        contactId={contactId}
        embedStudio
        studioCollabLinks
        onMissingContact={onMissingContact}
        onDeleted={onDeleted}
        onLoadedMeta={onMeta}
      />
    </div>
  );
}
