import type { ReadonlyURLSearchParams } from "next/navigation";

/** Canonical window id for “My Profile” (artist profile form in the studio). */
export const STUDIO_MY_PROFILE_WINDOW_ID = "my-profile";

/** Valid `open=` values for studio micro-apps (include `settings` when that window exists). */
const KNOWN_STUDIO_WINDOW_IDS = new Set([
  "feedback",
  "library",
  "releases",
  "crm",
  "royalties",
  "assistant",
  "calendar",
  STUDIO_MY_PROFILE_WINDOW_ID,
]);

export function resolveStudioOpenQueryToWindowId(
  open: string | null
): string | null {
  if (!open) return null;
  return KNOWN_STUDIO_WINDOW_IDS.has(open) ? open : null;
}

/**
 * Which studio micro-app should be focused, derived from /home search params
 * (deep links + `open=`). Mirrors the desktop auto-open logic.
 */
export function getStudioActiveAppFromSearchParams(
  sp: ReadonlyURLSearchParams
): string | null {
  if (sp.get("feedbackVersion")) return "feedback";
  if (sp.get("crmContactId")) return "crm";
  if (sp.get("catalogSongId")) return "library";
  if (sp.get("royaltiesReleaseId")) return "royalties";
  if (sp.get("releaseId")) return "releases";
  return resolveStudioOpenQueryToWindowId(sp.get("open"));
}
