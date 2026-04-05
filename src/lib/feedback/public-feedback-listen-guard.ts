import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { FEEDBACK_TOKEN_RE } from "@/lib/feedback/feedback-token";
import {
  loadFeedbackLinkByToken,
  versionFromLink,
  versionLabel,
} from "@/lib/feedback/public-session";
import {
  clientIpFromRequest,
  takeRateLimit,
} from "@/lib/utils/simple-rate-limit";

const READ_LIMIT = 120;
const READ_WINDOW_MS = 60_000;

export type PublicListenGateData = {
  admin: SupabaseClient;
  linkId: string;
  songTitle: string;
  versionLabel: string;
  storagePath: string;
};

/**
 * Validates token, rate limit, link enabled, and version row for public listen routes.
 * Each endpoint (bootstrap vs comments) uses its own rate-limit bucket key suffix.
 */
export async function gatePublicListenRequest(
  request: Request,
  token: string,
  rateSuffix: "boot" | "comments"
): Promise<
  { ok: true; data: PublicListenGateData } | { ok: false; response: NextResponse }
> {
  if (!FEEDBACK_TOKEN_RE.test(token)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found." }, { status: 404 }),
    };
  }

  const ip = clientIpFromRequest(request);
  const rl = takeRateLimit(
    `fb-read-${rateSuffix}:${ip}:${token}`,
    READ_LIMIT,
    READ_WINDOW_MS
  );
  if (!rl.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Too many requests.", retryAfterSec: rl.retryAfterSec },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        }
      ),
    };
  }

  try {
    const admin = createAdminSupabaseClient();
    const linkRow = await loadFeedbackLinkByToken(token, admin);
    if (!linkRow?.id) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Not found." }, { status: 404 }),
      };
    }
    if (!linkRow.enabled) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "This feedback link is disabled." },
          { status: 403 }
        ),
      };
    }
    const version = versionFromLink(linkRow);
    if (!version?.storage_path) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Not found." }, { status: 404 }),
      };
    }

    return {
      ok: true,
      data: {
        admin,
        linkId: linkRow.id,
        songTitle: version.catalog_songs?.title ?? "Untitled",
        versionLabel: versionLabel(version),
        storagePath: version.storage_path,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Could not verify feedback link." },
        { status: 503 }
      ),
    };
  }
}
