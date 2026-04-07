/** Preset labels for CRM role pills (stored in `crm_contacts.roles` text[]). */
export const CRM_ROLE_PRESETS = [
  "Producer",
  "Artist",
  "Manager",
  "Publicist",
  "Music Critic",
  "A&R",
  "Engineer",
  "Songwriter",
  "Booking agent",
  "Photographer",
  "Influencer",
  "Journalist",
] as const;

export type CrmRolePreset = (typeof CRM_ROLE_PRESETS)[number];

export function isCrmRolePreset(role: string | null | undefined): boolean {
  const t = role?.trim();
  if (!t) return false;
  return (CRM_ROLE_PRESETS as readonly string[]).includes(t);
}

/** Dedupe, trim, drop empties; preserves first-seen order. */
export function normalizeCrmRolesList(roles: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of roles) {
    const t = r.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function parseCrmRolesFromUnknown(v: unknown): string[] {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) {
    return normalizeCrmRolesList(
      v.filter((x): x is string => typeof x === "string")
    );
  }
  if (typeof v === "string") {
    const t = v.trim();
    return t ? [t] : [];
  }
  return [];
}

/** Import: export uses " | "; also accepts ; or comma-separated lists. */
export function parseRolesCsvCell(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const t = raw.trim();
  if (t.includes(" | ")) {
    return normalizeCrmRolesList(t.split(" | "));
  }
  if (t.includes(";")) {
    return normalizeCrmRolesList(t.split(";"));
  }
  if (t.includes(",")) {
    return normalizeCrmRolesList(t.split(","));
  }
  return normalizeCrmRolesList([t]);
}
