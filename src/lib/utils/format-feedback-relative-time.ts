/**
 * Short relative labels for public feedback comments (SoundCloud-style: 1w, 2m, …).
 */
export function formatFeedbackRelativeTime(iso: string, nowMs = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const sec = Math.max(0, (nowMs - t) / 1000);
  if (sec < 45) return "now";
  if (sec < 3600) return `${Math.max(1, Math.floor(sec / 60))}min`;
  if (sec < 86400) return `${Math.max(1, Math.floor(sec / 3600))}h`;
  if (sec < 604800) return `${Math.max(1, Math.floor(sec / 86400))}d`;
  if (sec < 2592000) return `${Math.max(1, Math.floor(sec / 604800))}w`;
  if (sec < 31536000) return `${Math.max(1, Math.floor(sec / 2592000))}m`;
  return `${Math.max(1, Math.floor(sec / 31536000))}y`;
}
