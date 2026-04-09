import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  validateAudioFile,
} from "@/lib/utils/audio-validation";

export const CATALOG_MP3_BUCKET = "catalog_mp3";

export const MAX_CATALOG_MP3_BYTES = 50 * 1024 * 1024;

/** Canonical Content-Type for catalog storage uploads (Supabase validates against bucket allow-list). */
const EXT_TO_MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".opus": "audio/opus",
  ".webm": "audio/webm",
};

/**
 * MIME type to send when uploading to `catalog_mp3`. Prefer the browser-reported
 * type when it looks like audio; otherwise infer from the file extension.
 */
export function catalogAudioUploadContentType(file: File): string {
  const t = (file.type || "").split(";")[0].trim().toLowerCase();
  if (t.startsWith("audio/")) return t;
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  return EXT_TO_MIME[ext] ?? "audio/mpeg";
}

/** Same as {@link catalogAudioUploadContentType} when only a display name is known (e.g. agent copy). */
export function catalogAudioUploadContentTypeFromFileName(
  fileName: string,
  reportedMime?: string
): string {
  const t = (reportedMime || "").split(";")[0].trim().toLowerCase();
  if (t.startsWith("audio/")) return t;
  const ext = "." + (fileName.split(".").pop() || "").toLowerCase();
  return EXT_TO_MIME[ext] ?? "audio/mpeg";
}

export function validateCatalogAudioFile(file: File): string | null {
  const result = validateAudioFile(file);
  if (!result.valid) {
    return result.errors[0] ?? "Invalid audio file.";
  }
  return null;
}

/** @deprecated Use {@link validateCatalogAudioFile} — same behavior; name kept for older imports. */
export const validateCatalogMp3File = validateCatalogAudioFile;

export function safeStorageFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || "track";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
  return cleaned.length ? cleaned : "track";
}

/** Comma-separated `accept` value for library version file inputs. */
export const CATALOG_VERSION_FILE_ACCEPT = [
  ...ACCEPTED_EXTENSIONS,
  ...ACCEPTED_MIME_TYPES,
].join(",");