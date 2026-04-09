"use client";

import { STUDIO_NEUTRAL_BRIDGE_CSS } from "@/components/studio/ui/studio-neutral-bridge-css";
import { S } from "@/components/studio/ui/s";
import { ArtistProfileSettingsForm } from "@/components/settings/ArtistProfileSettingsForm";

export function StudioSettingsWindow() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: S.bg,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: 16,
        }}
      >
        <style>{STUDIO_NEUTRAL_BRIDGE_CSS}</style>
        <div className="studio-neutral-bridge">
          <ArtistProfileSettingsForm />
        </div>
      </div>
    </div>
  );
}
