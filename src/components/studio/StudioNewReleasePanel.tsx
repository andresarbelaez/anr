"use client";

import { NewReleaseWizard } from "@/components/releases/NewReleaseWizard";
import { STUDIO_NEUTRAL_BRIDGE_CSS } from "@/components/studio/ui/studio-neutral-bridge-css";
import { S } from "@/components/studio/ui/s";

type Props = {
  wizardKey: number;
  onCancel: () => void;
  onCreated: (releaseId: string) => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
};

/**
 * In-window “new release” flow for the Releases micro-app stack (replaces modal overlay).
 */
export function StudioNewReleasePanel({
  wizardKey,
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
        className="shrink-0 border-b px-4 py-3 sm:px-5"
        style={{
          borderColor: S.border,
          background: S.surface,
          flexShrink: 0,
        }}
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
            onBusyChange={onBusyChange}
            onCancel={onCancel}
            onComplete={onCreated}
          />
        </div>
      </div>
    </div>
  );
}
