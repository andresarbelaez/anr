import { headers } from "next/headers";

/**
 * Best-effort mobile studio shell for SSR/first paint. Only returns `true` when confident
 * (avoids hydrating desktop as mobile). Safari often omits Client Hints — UA fallback covers phones.
 */
export async function getServerMobileStudioHint(): Promise<true | undefined> {
  const h = await headers();
  const ch = h.get("sec-ch-ua-mobile");
  if (ch === "?1") return true;
  if (ch === "?0") return undefined;

  const ua = h.get("user-agent") ?? "";
  if (/iPhone|iPod/i.test(ua)) return true;
  if (/Android.+Mobile/i.test(ua)) return true;

  return undefined;
}
