import { resolveStudioOpenQueryToWindowId } from "@/lib/studio/studio-url-app";

/**
 * Which studio micro-app the URL implies, or null for the bare room (no window query).
 */
export function getStudioNavSection(
  searchParams: URLSearchParams
): string | null {
  if (searchParams.get("feedbackVersion")) return "feedback";
  if (searchParams.get("crmContactId")) return "crm";
  if (searchParams.get("catalogSongId")) return "library";
  if (searchParams.get("royaltiesReleaseId")) return "royalties";
  if (searchParams.get("releaseId")) return "releases";
  return resolveStudioOpenQueryToWindowId(searchParams.get("open"));
}
