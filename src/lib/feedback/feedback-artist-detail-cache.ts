import type { PublicFeedbackRootJson } from "@/lib/feedback/types";
import { FEEDBACK_AUDIO_SIGN_SEC } from "@/lib/feedback/public-session";

export type FeedbackArtistDetailVersion = {
  id: string;
  label: string | null;
  file_name: string;
  storage_path: string;
  catalog_songs: { id: string; title: string } | null;
};

export type FeedbackArtistDetailLinkRow = {
  id: string;
  token: string;
  enabled: boolean;
};

export type FeedbackArtistDetailCacheEntry = {
  version: FeedbackArtistDetailVersion;
  linkRow: FeedbackArtistDetailLinkRow | null;
  comments: PublicFeedbackRootJson[];
  audioUrl: string;
  expiresInSec: number;
  cachedAt: number;
};

const map = new Map<string, FeedbackArtistDetailCacheEntry>();

/** Refresh before the signed URL is expected to expire */
const EXPIRY_BUFFER_MS = 120_000;

function isStale(e: FeedbackArtistDetailCacheEntry): boolean {
  const ttlMs = Math.max(
    60_000,
    (e.expiresInSec || FEEDBACK_AUDIO_SIGN_SEC) * 1000 - EXPIRY_BUFFER_MS
  );
  return Date.now() > e.cachedAt + ttlMs;
}

export function readFeedbackArtistDetailCache(
  versionId: string
): FeedbackArtistDetailCacheEntry | null {
  if (typeof window === "undefined") return null;
  const e = map.get(versionId);
  if (!e || isStale(e)) {
    if (e) map.delete(versionId);
    return null;
  }
  return e;
}

export function writeFeedbackArtistDetailCache(
  versionId: string,
  entry: {
    version: FeedbackArtistDetailVersion;
    linkRow: FeedbackArtistDetailLinkRow | null;
    comments: PublicFeedbackRootJson[];
    audioUrl: string;
    expiresInSec?: number;
  }
) {
  if (typeof window === "undefined" || !entry.audioUrl) return;
  map.set(versionId, {
    ...entry,
    expiresInSec: entry.expiresInSec ?? FEEDBACK_AUDIO_SIGN_SEC,
    cachedAt: Date.now(),
  });
}

export function invalidateFeedbackArtistDetailCache(versionId: string) {
  map.delete(versionId);
}
