import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { FeedbackCommentRow } from "@/lib/feedback/build-comment-tree";
import { CATALOG_MP3_BUCKET } from "@/lib/utils/catalog-mp3";

/** Signed URL lifetime for public listen links (longer = better browser cache reuse). */
export const FEEDBACK_AUDIO_SIGN_SEC = 3600;

export { buildCommentTree } from "@/lib/feedback/build-comment-tree";
export type { FeedbackCommentRow } from "@/lib/feedback/build-comment-tree";

type VersionRow = {
  storage_path: string;
  label: string | null;
  file_name: string;
  catalog_songs: {
    title: string;
    profiles: { artist_name: string } | null;
  } | null;
};

type LinkRow = {
  id: string;
  enabled: boolean;
  catalog_song_versions: VersionRow | VersionRow[] | null;
};

export function versionFromLink(row: LinkRow): VersionRow | null {
  const v = row.catalog_song_versions;
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function loadFeedbackLinkByToken(
  token: string,
  client?: SupabaseClient
): Promise<LinkRow | null> {
  const admin = client ?? createAdminSupabaseClient();
  const { data, error } = await admin
    .from("feedback_version_links")
    .select(
      `
      id,
      enabled,
      catalog_song_versions (
        storage_path,
        label,
        file_name,
        catalog_songs (
          title,
          profiles ( artist_name )
        )
      )
    `
    )
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as LinkRow;
}

export async function loadCommentsForLink(
  linkId: string,
  client?: SupabaseClient
): Promise<FeedbackCommentRow[]> {
  const admin = client ?? createAdminSupabaseClient();
  const { data, error } = await admin
    .from("feedback_comments")
    .select(
      "id, body, seconds_into_track, display_name, parent_id, created_at"
    )
    .eq("feedback_link_id", linkId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as FeedbackCommentRow[];
}

export async function signCatalogMp3Path(
  storagePath: string,
  client?: SupabaseClient,
  expiresInSec: number = FEEDBACK_AUDIO_SIGN_SEC
): Promise<string | null> {
  const admin = client ?? createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from(CATALOG_MP3_BUCKET)
    .createSignedUrl(storagePath, expiresInSec);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function versionLabel(v: VersionRow): string {
  return (v.label?.trim() || v.file_name || "Version").trim();
}

export function artistNameFromVersion(v: VersionRow): string {
  const n = v.catalog_songs?.profiles?.artist_name?.trim();
  return n || "this artist";
}
