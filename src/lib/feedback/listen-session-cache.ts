import type { PublicFeedbackSessionJson } from "@/lib/feedback/types";

const CACHE_KEY_PREFIX = "sidestage-fb-listen-v1";

type CachedPayload = {
  songTitle: string;
  versionLabel: string;
  audioUrl: string;
  comments: PublicFeedbackSessionJson["comments"];
  /** Epoch ms — treat cache as stale shortly before signed URL expires */
  expiresAt: number;
};

function storageKey(token: string) {
  return `${CACHE_KEY_PREFIX}:${token}`;
}

export function readListenSessionCache(
  token: string
): PublicFeedbackSessionJson | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(token));
    if (!raw) return null;
    const d = JSON.parse(raw) as CachedPayload;
    if (
      typeof d.audioUrl !== "string" ||
      typeof d.expiresAt !== "number" ||
      !Array.isArray(d.comments)
    ) {
      return null;
    }
    const bufferMs = 90_000;
    if (Date.now() > d.expiresAt - bufferMs) return null;
    const remainingSec = Math.max(
      60,
      Math.floor((d.expiresAt - Date.now()) / 1000)
    );
    return {
      songTitle: d.songTitle,
      versionLabel: d.versionLabel,
      audioUrl: d.audioUrl,
      audioUrlExpiresInSec: remainingSec,
      comments: d.comments,
    };
  } catch {
    return null;
  }
}

export function writeListenSessionCache(
  token: string,
  session: PublicFeedbackSessionJson
) {
  if (typeof window === "undefined") return;
  try {
    const ttlSec = Math.max(120, session.audioUrlExpiresInSec || 3600);
    const payload: CachedPayload = {
      songTitle: session.songTitle,
      versionLabel: session.versionLabel,
      audioUrl: session.audioUrl,
      comments: session.comments,
      expiresAt: Date.now() + ttlSec * 1000,
    };
    sessionStorage.setItem(storageKey(token), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}
