import type { CatalogSongVersion } from "@/lib/supabase/types";

/** Lowercase extension from a storage file name, or null if missing. */
export function catalogVersionFileExtension(fileName: string): string | null {
  const trimmed = fileName.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot < 1 || lastDot >= trimmed.length - 1) return null;
  const ext = trimmed
    .slice(lastDot + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return ext.length > 0 ? ext : null;
}

/**
 * Row title for a catalog version: uses custom label when set, otherwise
 * `file_name`, and appends the file type as ` (.ext)` from `file_name` when it
 * is not already shown that way. Trailing `.ext` on the visible base is folded
 * into the parenthetical so labels stay readable (e.g. `Radio edit (.mp3)`).
 */
export function catalogVersionRowLabel(
  v: Pick<CatalogSongVersion, "label" | "file_name">
): string {
  const ext = catalogVersionFileExtension(v.file_name);
  const baseRaw = (v.label?.trim() || v.file_name.trim()).trim();
  if (!ext) return baseRaw;

  const alreadyTyped = new RegExp(`\\(\\.${ext}\\)\\s*$`, "i").test(baseRaw);
  if (alreadyTyped) return baseRaw;

  let stem = baseRaw;
  const stemExt = catalogVersionFileExtension(stem);
  if (stemExt === ext && stem.toLowerCase().endsWith(`.${ext}`)) {
    stem = stem.slice(0, -(ext.length + 1)).trimEnd();
  }
  if (stem.length === 0) stem = baseRaw;

  return `${stem} (.${ext})`;
}
