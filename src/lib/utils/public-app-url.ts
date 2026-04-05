/**
 * Browser-visible origin for links (Stripe redirects, assistant share URLs, etc.).
 * Set NEXT_PUBLIC_APP_URL on Vercel to the canonical HTTPS host (no trailing slash).
 */
export function getPublicAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim() ||
    "http://localhost:3000"
  );
}

export function buildGuestListenUrl(token: string): string {
  const t = String(token ?? "").trim();
  if (!t) return "";
  return `${getPublicAppOrigin()}/listen/${t}`;
}
