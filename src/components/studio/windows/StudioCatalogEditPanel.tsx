"use client";

import { useCallback } from "react";
import { CatalogSongEditClient } from "@/components/catalog/CatalogSongEditClient";
import { STUDIO_NEUTRAL_BRIDGE_CSS } from "@/components/studio/ui/studio-neutral-bridge-css";

type Props = {
  songId: string;
  onMissingSong?: () => void;
  onDeleted?: () => void;
  onLoadedMeta?: (meta: { title: string }) => void;
};

export function StudioCatalogEditPanel({
  songId,
  onMissingSong,
  onDeleted,
  onLoadedMeta,
}: Props) {
  const onMeta = useCallback(
    (m: { title: string }) => {
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
      <CatalogSongEditClient
        songId={songId}
        embedStudio
        onMissingSong={onMissingSong}
        onDeleted={onDeleted}
        onLoadedMeta={onMeta}
      />
    </div>
  );
}
