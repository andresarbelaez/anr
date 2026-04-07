import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CATALOG_MP3_BUCKET, safeStorageFileName } from "@/lib/utils/catalog-mp3";

export function parseArgs(argsJson: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(argsJson || "{}");
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function asUuid(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  ) {
    return null;
  }
  return s;
}

export function asNonEmptyString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export function asOptionalString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  return v;
}

export function asBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  return undefined;
}

export function buildUpdateReleaseSummary(
  releaseId: string,
  a: Record<string, unknown>
): string {
  const parts: string[] = [`Update release ${releaseId.slice(0, 8)}…`];
  if (asNonEmptyString(a.title)) parts.push(`title → "${asNonEmptyString(a.title)}"`);
  if (asNonEmptyString(a.release_date))
    parts.push(`release date → ${asNonEmptyString(a.release_date)}`);
  if (asNonEmptyString(a.type)) parts.push(`type → ${asNonEmptyString(a.type)}`);
  if (asOptionalString(a.genre) !== undefined)
    parts.push(`genre → ${asNonEmptyString(a.genre) || "(clear)"}`);
  if (asOptionalString(a.description) !== undefined)
    parts.push("description updated");
  return parts.join(" ");
}

export function stripStoragePath(p: string): string {
  return p.replace(/^\/+/, "").trim();
}

export function isSafeRelPath(p: string): boolean {
  return !p.includes("..") && !p.startsWith("/");
}

export async function copyAgentAttachmentToCatalogMp3(
  supabase: SupabaseClient,
  userId: string,
  songId: string,
  agentPathRaw: string,
  displayFileName: string
): Promise<{ ok: true; storagePath: string } | { ok: false; message: string }> {
  const agentPath = stripStoragePath(agentPathRaw);
  if (!isSafeRelPath(agentPath) || !agentPath.startsWith(`${userId}/`)) {
    return {
      ok: false,
      message:
        "agent_attachment_path must be your attachment path (starts with your user id).",
    };
  }
  const { data: blob, error: dErr } = await supabase.storage
    .from("agent_attachments")
    .download(agentPath);
  if (dErr || !blob) {
    return { ok: false, message: dErr?.message ?? "Could not read attachment." };
  }
  const nameLower = displayFileName.trim().toLowerCase();
  if (!nameLower.endsWith(".mp3")) {
    return {
      ok: false,
      message: "Library versions must use .mp3 (catalog_mp3 bucket).",
    };
  }
  const buf = await blob.arrayBuffer();
  if (buf.byteLength > 50 * 1024 * 1024) {
    return { ok: false, message: "File exceeds 50MB limit." };
  }
  const objectName = `${randomUUID()}-${safeStorageFileName(displayFileName)}`;
  const storagePath = `${userId}/${songId}/${objectName}`;
  const { error: uErr } = await supabase.storage
    .from(CATALOG_MP3_BUCKET)
    .upload(storagePath, buf, {
      contentType: "audio/mpeg",
      upsert: false,
    });
  if (uErr) return { ok: false, message: uErr.message };
  return { ok: true, storagePath };
}

export function parseExistingCatalogMp3Path(
  userId: string,
  songId: string,
  pathRaw: string
): { ok: true; path: string } | { ok: false; message: string } {
  const path = stripStoragePath(pathRaw);
  if (!isSafeRelPath(path)) {
    return { ok: false, message: "Invalid catalog_mp3 path." };
  }
  const prefix = `${userId}/${songId}/`;
  if (!path.startsWith(prefix)) {
    return {
      ok: false,
      message:
        "existing_catalog_mp3_path must start with {your_user_id}/{song_id}/",
    };
  }
  return { ok: true, path };
}
