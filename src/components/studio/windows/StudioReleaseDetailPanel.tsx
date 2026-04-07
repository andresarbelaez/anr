"use client";

import { useCallback } from "react";
import { ReleaseDetailClient } from "@/components/releases/ReleaseDetailClient";
import { STUDIO_NEUTRAL_BRIDGE_CSS } from "@/components/studio/ui/studio-neutral-bridge-css";

type Props = {
  releaseId: string;
  onMissingRelease?: () => void;
  onLoadedMeta?: (meta: { title: string }) => void;
};

export function StudioReleaseDetailPanel({
  releaseId,
  onMissingRelease,
  onLoadedMeta,
}: Props) {
  const onMeta = useCallback(
    (meta: { title: string }) => {
      onLoadedMeta?.(meta);
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
      <ReleaseDetailClient
        releaseId={releaseId}
        embedStudio
        onMissingRelease={onMissingRelease}
        onLoadedMeta={onMeta}
      />
    </div>
  );
}
