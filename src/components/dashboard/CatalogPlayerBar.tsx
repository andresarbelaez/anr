"use client";

import { MicroappAudioPlayerBar } from "@/components/audio/MicroappAudioPlayerBar";
import { useCatalogPlayer } from "@/contexts/catalog-player-context";

export function CatalogPlayerBar() {
  const {
    activeTrack,
    playerLoading,
    playerError,
    clearCatalogPlayer,
  } = useCatalogPlayer();

  return (
    <MicroappAudioPlayerBar
      variant="dashboard"
      track={activeTrack}
      loading={playerLoading}
      error={playerError}
      onClear={clearCatalogPlayer}
      ariaLabel="Library audio player"
    />
  );
}
