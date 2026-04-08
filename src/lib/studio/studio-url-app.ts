import type { ReadonlyURLSearchParams } from "next/navigation";

const OPEN_PANEL_IDS = new Set([
  "feedback",
  "library",
  "releases",
  "crm",
  "royalties",
  "assistant",
  "calendar",
  "settings",
]);

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
  const open = sp.get("open");
  if (open && OPEN_PANEL_IDS.has(open)) return open;
  return null;
}
