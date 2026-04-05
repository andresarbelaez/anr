import { isUuid } from "@/lib/utils/csv-io";

/** Separates collaboration tokens in CSV (must match export `join(" | ")`). */
export function splitCollabTokens(s: string): string[] {
  const trimmed = s.trim();
  if (!trimmed) return [];
  if (trimmed.includes(" | ")) {
    return trimmed
      .split(/\s+\|\s+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return trimmed
    .split(/\s*;\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export type ParsedCollabToken =
  | { kind: "release"; id: string; note: string | null }
  | { kind: "catalog"; id: string; note: string | null };

/** Parses `release:UUID` or `release:UUID|||note` (same for catalog). */
export function parseCollaborationToken(raw: string): ParsedCollabToken | null {
  const t = raw.trim();
  const rel = t.match(
    /^release:\s*([0-9a-f-]{36})(?:\|\|\|([\s\S]*))?$/
  );
  if (rel && isUuid(rel[1])) {
    const note = rel[2] != null ? rel[2].trim() || null : null;
    return { kind: "release", id: rel[1], note };
  }
  const cat = t.match(
    /^catalog:\s*([0-9a-f-]{36})(?:\|\|\|([\s\S]*))?$/
  );
  if (cat && isUuid(cat[1])) {
    const note = cat[2] != null ? cat[2].trim() || null : null;
    return { kind: "catalog", id: cat[1], note };
  }
  return null;
}

export function collaborationToToken(row: {
  release_id: string | null;
  catalog_song_id: string | null;
  note?: string | null;
}): string {
  const note = row.note?.trim();
  if (row.release_id) {
    return note
      ? `release:${row.release_id}|||${note}`
      : `release:${row.release_id}`;
  }
  if (row.catalog_song_id) {
    return note
      ? `catalog:${row.catalog_song_id}|||${note}`
      : `catalog:${row.catalog_song_id}`;
  }
  return "";
}
