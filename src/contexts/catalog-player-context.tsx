"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { CATALOG_MP3_BUCKET } from "@/lib/utils/catalog-mp3";

export type CatalogActiveTrack = {
  src: string;
  songTitle: string;
  versionLabel: string;
};

type CatalogPlayerContextValue = {
  activeTrack: CatalogActiveTrack | null;
  playerLoading: boolean;
  playerError: string | null;
  playCatalogVersion: (
    storagePath: string,
    songTitle: string,
    versionLabel: string
  ) => Promise<void>;
  clearCatalogPlayer: () => void;
};

const CatalogPlayerContext = createContext<CatalogPlayerContextValue | null>(
  null
);

export function CatalogPlayerProvider({ children }: { children: ReactNode }) {
  const [activeTrack, setActiveTrack] = useState<CatalogActiveTrack | null>(
    null
  );
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const playCatalogVersion = useCallback(
    async (
      storagePath: string,
      songTitle: string,
      versionLabel: string
    ) => {
      setPlayerLoading(true);
      setPlayerError(null);
      setActiveTrack(null);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from(CATALOG_MP3_BUCKET)
          .createSignedUrl(storagePath, 3600);

        if (error || !data?.signedUrl) {
          setPlayerError(
            error?.message ?? "Could not open this file for playback."
          );
          return;
        }

        setActiveTrack({
          src: data.signedUrl,
          songTitle,
          versionLabel,
        });
      } catch {
        setPlayerError("Could not load audio.");
      } finally {
        setPlayerLoading(false);
      }
    },
    []
  );

  const clearCatalogPlayer = useCallback(() => {
    setActiveTrack(null);
    setPlayerError(null);
    setPlayerLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      activeTrack,
      playerLoading,
      playerError,
      playCatalogVersion,
      clearCatalogPlayer,
    }),
    [
      activeTrack,
      playerLoading,
      playerError,
      playCatalogVersion,
      clearCatalogPlayer,
    ]
  );

  return (
    <CatalogPlayerContext.Provider value={value}>
      {children}
    </CatalogPlayerContext.Provider>
  );
}

export function useCatalogPlayer(): CatalogPlayerContextValue {
  const ctx = useContext(CatalogPlayerContext);
  if (!ctx) {
    throw new Error("useCatalogPlayer must be used within CatalogPlayerProvider");
  }
  return ctx;
}
