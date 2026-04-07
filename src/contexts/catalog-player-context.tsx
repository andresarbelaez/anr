"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { CATALOG_MP3_BUCKET } from "@/lib/utils/catalog-mp3";

export type CatalogActiveTrack = {
  src: string;
  songTitle: string;
  versionLabel: string;
  /** Increments on each successful user-initiated play; used by the studio Library embed to skip autoplay on remount. */
  playRequestId: number;
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
  /**
   * Studio Library embedded player: returns true only when `playRequestId` is newer than the last one
   * this gate accepted (user clicked a version), not when the same request is rebound after remount.
   */
  shouldAutoplayStudioLibraryEmbed: (playRequestId: number) => boolean;
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
  const playRequestSeqRef = useRef(0);
  const lastLibraryEmbedConsumedRequestIdRef = useRef(0);

  const shouldAutoplayStudioLibraryEmbed = useCallback(
    (playRequestId: number) => {
      const prev = lastLibraryEmbedConsumedRequestIdRef.current;
      if (playRequestId <= prev) return false;
      lastLibraryEmbedConsumedRequestIdRef.current = playRequestId;
      return true;
    },
    []
  );

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

        const playRequestId = ++playRequestSeqRef.current;
        setActiveTrack({
          src: data.signedUrl,
          songTitle,
          versionLabel,
          playRequestId,
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
    lastLibraryEmbedConsumedRequestIdRef.current = 0;
  }, []);

  const value = useMemo(
    () => ({
      activeTrack,
      playerLoading,
      playerError,
      playCatalogVersion,
      clearCatalogPlayer,
      shouldAutoplayStudioLibraryEmbed,
    }),
    [
      activeTrack,
      playerLoading,
      playerError,
      playCatalogVersion,
      clearCatalogPlayer,
      shouldAutoplayStudioLibraryEmbed,
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
