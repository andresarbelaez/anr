export const CATALOG_MP3_BUCKET = "catalog_mp3";

export const MAX_CATALOG_MP3_BYTES = 50 * 1024 * 1024;

export function validateCatalogMp3File(file: File): string | null {
  const ext = file.name.toLowerCase().endsWith(".mp3");
  const mimeOk =
    file.type === "audio/mpeg" ||
    file.type === "audio/mp3" ||
    file.type === "";
  if (!ext && !mimeOk) {
    return "Please choose an MP3 file.";
  }
  if (file.size > MAX_CATALOG_MP3_BYTES) {
    return "File is too large (max 50MB).";
  }
  return null;
}

export function safeStorageFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || "file.mp3";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "file.mp3";
}
