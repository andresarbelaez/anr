"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Users, Download, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CrmContact, CrmContactCollaboration } from "@/lib/supabase/types";
import { parseRolesCsvCell } from "@/lib/crm/crm-roles";
import { CRM_STATUS_OPTIONS } from "@/lib/crm-status";
import { S } from "@/components/studio/ui/s";
import { useStudioWindowChrome } from "@/components/studio/studio-window-chrome";
import { StudioCrmEditPanel } from "@/components/studio/windows/StudioCrmEditPanel";
import { StudioNewCrmContactPanel } from "@/components/studio/StudioNewCrmContactPanel";
import { StudioMicroappNewButton } from "@/components/studio/ui/StudioMicroappNewButton";
import {
  collaborationToToken,
  parseCollaborationToken,
  splitCollabTokens,
} from "@/lib/crm-collab-tokens";
import { downloadCsv, getCell, parseCsvRecords } from "@/lib/utils/csv-io";

// ── Helpers ───────────────────────────────────────────────────────────────

const ALLOWED_STATUS = new Set(CRM_STATUS_OPTIONS.map((o) => o.value as string));

function statusLabel(value: string) {
  return CRM_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function normalizeStatus(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return ALLOWED_STATUS.has(t) ? t : "active";
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:        { bg: S.successBg,    color: S.success },
  collaborator:  { bg: S.accentBg,     color: S.accent },
  warm:          { bg: S.warningBg,    color: S.warning },
  cold:          { bg: S.borderFaint,  color: S.textFaint },
  on_hold:       { bg: "rgba(230,126,34,0.1)", color: "#e67e22" },
  archived:      { bg: S.borderFaint,  color: S.textFaint },
};

type ContactCollabChip = { kind: "release" | "catalog"; id: string; label: string; note: string | null };
type Release = { id: string; title: string };
type Song    = { id: string; title: string };

type CrmStackEntry =
  | { type: "list" }
  | { type: "new" }
  | { type: "detail"; contactId: string };

function initialCrmStack(initialContactId?: string | null): {
  past: CrmStackEntry[];
  current: CrmStackEntry;
  future: CrmStackEntry[];
} {
  if (initialContactId) {
    return {
      past: [{ type: "list" }],
      current: { type: "detail", contactId: initialContactId },
      future: [],
    };
  }
  return { past: [], current: { type: "list" }, future: [] };
}

// ── Sub-components ────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
      <div className="animate-spin" style={{ width: 22, height: 22, border: `2px solid ${S.border}`, borderTopColor: S.accent, borderRadius: "50%" }} />
    </div>
  );
}

function IoBanner({ msg }: { msg: { kind: "success" | "error"; text: string } | null }) {
  if (!msg) return null;
  return (
    <div style={{ margin: "8px 0", padding: "8px 12px", borderRadius: 3, fontSize: 11, background: msg.kind === "error" ? S.errorBg : S.successBg, color: msg.kind === "error" ? S.error : S.success, border: `1px solid ${msg.kind === "error" ? S.error : S.success}`, opacity: 0.9 }}>
      {msg.text}
    </div>
  );
}

function SmallBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 11, fontWeight: 500,
        color: disabled ? S.textFaint : S.textSecondary,
        background: "transparent", border: `1px solid ${S.border}`,
        borderRadius: 2, padding: "5px 8px", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon} {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────

const CRM_DETAIL_FALLBACK = "Contact";

export function StudioCrmWindow({
  initialContactId = null,
}: {
  initialContactId?: string | null;
}) {
  const chrome = useStudioWindowChrome();
  const boot = initialCrmStack(initialContactId);
  const [past, setPast] = useState<CrmStackEntry[]>(boot.past);
  const [current, setCurrent] = useState<CrmStackEntry>(boot.current);
  const [future, setFuture] = useState<CrmStackEntry[]>(boot.future);
  const [detailTitle, setDetailTitle] = useState<string | null>(null);
  const [newContactFormKey, setNewContactFormKey] = useState(0);
  const [newContactBusy, setNewContactBusy] = useState(false);

  const appliedBootstrap = useRef<string | null>(initialContactId ?? null);
  useEffect(() => {
    if (!initialContactId) return;
    if (appliedBootstrap.current === initialContactId) return;
    appliedBootstrap.current = initialContactId;
    setPast([{ type: "list" }]);
    setCurrent({ type: "detail", contactId: initialContactId });
    setFuture([]);
    setDetailTitle(null);
  }, [initialContactId]);

  useEffect(() => {
    if (current.type !== "detail") return;
    setDetailTitle(null);
  }, [current]);

  const goToDetail = useCallback(
    (contactId: string) => {
      setDetailTitle(null);
      setPast((p) => [...p, current]);
      setCurrent({ type: "detail", contactId });
      setFuture([]);
    },
    [current]
  );

  const goBack = useCallback(() => {
    if (past.length === 0) return;
    if (current.type === "new" && newContactBusy) return;
    const prev = past[past.length - 1];
    setFuture((f) => [current, ...f]);
    setCurrent(prev);
    setPast((p) => p.slice(0, -1));
    if (prev.type === "list") setDetailTitle(null);
  }, [past, current, newContactBusy]);

  const goForward = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setPast((p) => [...p, current]);
    setCurrent(next);
    setFuture((f) => f.slice(1));
    if (next.type === "list") setDetailTitle(null);
  }, [future, current]);

  const canBack =
    past.length > 0 && !(current.type === "new" && newContactBusy);
  const canForward = future.length > 0;

  useEffect(() => {
    if (current.type !== "new") setNewContactBusy(false);
  }, [current.type]);

  const chromeTitle = useMemo(() => {
    if (current.type === "list") return null;
    if (current.type === "new") return "New contact";
    return detailTitle ?? CRM_DETAIL_FALLBACK;
  }, [current.type, detailTitle]);

  const goToNewContact = useCallback(() => {
    setDetailTitle(null);
    setPast((p) => [...p, current]);
    setCurrent({ type: "new" });
    setFuture([]);
    setNewContactFormKey((k) => k + 1);
  }, [current]);

  useEffect(() => {
    chrome.setTitle(chromeTitle);
  }, [chrome, chromeTitle]);

  useEffect(() => {
    chrome.setNav({
      canBack,
      canForward,
      goBack,
      goForward,
    });
  }, [chrome, canBack, canForward, goBack, goForward]);

  const onMissingContact = useCallback(() => {
    goBack();
  }, [goBack]);

  const onContactMeta = useCallback((meta: { name: string }) => {
    const t = meta.name.trim();
    setDetailTitle(t.length > 28 ? `${t.slice(0, 26)}…` : t);
  }, []);

  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [collabsByContactId, setCollabsByContactId] = useState<Record<string, ContactCollabChip[]>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [ioMessage, setIoMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const loadContacts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("crm_contacts").select("*").order("updated_at", { ascending: false });
    const list = (data as CrmContact[]) || [];
    setContacts(list);

    if (list.length === 0) { setCollabsByContactId({}); return; }
    const ids = list.map((c) => c.id);

    const [{ data: collabRows }, { data: rels }, { data: songs }] = await Promise.all([
      supabase.from("crm_contact_collaborations").select("*").in("contact_id", ids),
      supabase.from("releases").select("id, title"),
      supabase.from("catalog_songs").select("id, title"),
    ]);

    const releaseMap = Object.fromEntries(((rels as Release[]) || []).map((r) => [r.id, r.title]));
    const songMap    = Object.fromEntries(((songs as Song[])   || []).map((s) => [s.id, s.title]));
    const byContact: Record<string, ContactCollabChip[]> = {};
    for (const id of ids) byContact[id] = [];
    for (const row of (collabRows as CrmContactCollaboration[]) || []) {
      if (row.release_id) {
        byContact[row.contact_id]?.push({ kind: "release", id: row.release_id, label: releaseMap[row.release_id] ?? "Release", note: row.note ?? null });
      } else if (row.catalog_song_id) {
        byContact[row.contact_id]?.push({ kind: "catalog", id: row.catalog_song_id, label: songMap[row.catalog_song_id] ?? "Library", note: row.note ?? null });
      }
    }
    setCollabsByContactId(byContact);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadContacts();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadContacts]);

  /** From stack “new” screen: open detail without leaving “new” in history. */
  const handleNewContactCreated = useCallback(
    async (contactId: string) => {
      await loadContacts();
      setFuture([]);
      setDetailTitle(null);
      setCurrent({ type: "detail", contactId });
    },
    [loadContacts]
  );

  // ── Export ──────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    setIoMessage(null);
    try {
      const supabase = createClient();
      const { data: rows, error } = await supabase.from("crm_contacts").select("*").order("name");
      if (error) throw new Error(error.message);
      const list = (rows as CrmContact[]) || [];
      const ids = list.map((c) => c.id);
      const collabTokens: Record<string, string[]> = {};
      if (ids.length) {
        const { data: collabs, error: cErr } = await supabase.from("crm_contact_collaborations").select("*").in("contact_id", ids);
        if (cErr) throw new Error(cErr.message);
        for (const row of (collabs as CrmContactCollaboration[]) || []) {
          const token = collaborationToToken(row);
          if (!token) continue;
          if (!collabTokens[row.contact_id]) collabTokens[row.contact_id] = [];
          collabTokens[row.contact_id].push(token);
        }
      }
      downloadCsv(`sidestage-crm-export-${new Date().toISOString().slice(0, 10)}.csv`,
        list.map((c) => ({
          name: c.name, email: c.email ?? "", instagram: c.instagram ?? "",
          tiktok: c.tiktok ?? "", website: c.website ?? "",
          roles: (c.roles ?? []).join(" | "), notes: c.notes ?? "",
          last_contacted_at: c.last_contacted_at ?? "", status: c.status,
          collaborations: (collabTokens[c.id] || []).join(" | "),
        }))
      );
    } catch (e) {
      setIoMessage({ kind: "error", text: e instanceof Error ? e.message : "Export failed." });
    } finally { setExporting(false); }
  };

  // ── Import ──────────────────────────────────────────────────────────────

  const handleImport = async (file: File) => {
    setImporting(true);
    setIoMessage(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");
      const records = await parseCsvRecords(file);
      if (records.length === 0) { setIoMessage({ kind: "error", text: "No rows found in CSV." }); return; }

      let created = 0, skipped = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2;
        const name = getCell(row, "name", "contact_name", "contact name");
        if (!name) { skipped++; errors.push(`Row ${rowNum}: missing name, skipped.`); continue; }

        const { data: inserted, error: insErr } = await supabase.from("crm_contacts").insert({
          user_id: user.id, name,
          email: getCell(row, "email", "e-mail") || null,
          instagram: getCell(row, "instagram", "ig") || null,
          tiktok: getCell(row, "tiktok", "tik_tok") || null,
          website: getCell(row, "website", "url", "other_url", "other url") || null,
          roles: parseRolesCsvCell(
            getCell(row, "roles", "role", "roles / titles")
          ),
          notes: getCell(row, "notes", "note") || null,
          last_contacted_at: getCell(row, "last_contacted_at", "last_contacted", "last contacted") || null,
          status: normalizeStatus(getCell(row, "status") || "active"),
        }).select("id").single();

        if (insErr || !inserted) { skipped++; errors.push(`Row ${rowNum}: ${insErr?.message ?? "insert failed"}`); continue; }
        created++;

        const contactId = inserted.id as string;
        const collabRaw = getCell(row, "collaborations", "collaboration", "links");
        if (!collabRaw) continue;
        for (const token of splitCollabTokens(collabRaw)) {
          const parsed = parseCollaborationToken(token);
          if (!parsed) { errors.push(`Row ${rowNum}: ignored token "${token}"`); continue; }
          const payload = parsed.kind === "release"
            ? { contact_id: contactId, release_id: parsed.id, note: parsed.note }
            : { contact_id: contactId, catalog_song_id: parsed.id, note: parsed.note };
          const { error: cErr } = await supabase.from("crm_contact_collaborations").insert(payload);
          if (cErr) errors.push(`Row ${rowNum}: collab "${token}" — ${cErr.message}`);
        }
      }

      await loadContacts();
      const parts = [`Imported ${created} contact(s).`];
      if (skipped) parts.push(`${skipped} row(s) skipped.`);
      if (errors.length) parts.push(errors.slice(0, 6).join(" "));
      setIoMessage({ kind: errors.length && created === 0 ? "error" : "success", text: parts.join(" ") });
    } catch (e) {
      setIoMessage({ kind: "error", text: e instanceof Error ? e.message : "Import failed." });
    } finally { setImporting(false); }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: S.bg,
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {current.type === "list" ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: S.surface,
              borderBottom: `1px solid ${S.border}`,
              flexShrink: 0,
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: S.textSecondary,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              CRM
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <SmallBtn
                icon={<Download size={10} />}
                label={exporting ? "…" : "Export"}
                onClick={() => void handleExport()}
                disabled={exporting}
              />
              <SmallBtn
                icon={<Upload size={10} />}
                label={importing ? "…" : "Import"}
                onClick={() => importRef.current?.click()}
                disabled={importing}
              />
              <input
                ref={importRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImport(f);
                  e.target.value = "";
                }}
              />
              <StudioMicroappNewButton
                label="New contact"
                onClick={goToNewContact}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            <IoBanner msg={ioMessage} />
            {loading ? (
              <Spinner />
            ) : contacts.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  paddingTop: 48,
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    background: S.surface,
                    border: `1px solid ${S.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users size={22} color={S.textFaint} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 500, color: S.textMuted }}>
                  No contacts yet
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: S.textFaint,
                    maxWidth: 240,
                    lineHeight: 1.6,
                  }}
                >
                  Track collaborators, managers, and relationships. Link them to
                  releases or library songs.
                </p>
                <div style={{ marginTop: 4 }}>
                  <StudioMicroappNewButton
                    label="New contact"
                    onClick={goToNewContact}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {contacts.map((c) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    collabs={collabsByContactId[c.id] ?? []}
                    onEdit={() => goToDetail(c.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : current.type === "new" ? (
        <StudioNewCrmContactPanel
          formKey={newContactFormKey}
          onBusyChange={setNewContactBusy}
          onCancel={goBack}
          onCreated={handleNewContactCreated}
        />
      ) : (
        <StudioCrmEditPanel
          contactId={current.contactId}
          onMissingContact={onMissingContact}
          onDeleted={() => {
            goBack();
            void loadContacts();
          }}
          onLoadedMeta={onContactMeta}
        />
      )}
    </div>
  );
}

// ── Contact card ──────────────────────────────────────────────────────────

function ContactCard({
  contact: c,
  collabs,
  onEdit,
}: {
  contact: CrmContact;
  collabs: ContactCollabChip[];
  onEdit: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const st = STATUS_STYLE[c.status] ?? { bg: S.borderFaint, color: S.textFaint };

  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 4,
        border: `1px solid ${hovered ? S.borderAccent : S.border}`,
        background: hovered ? S.hover : S.surface,
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: S.textPrimary, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.name}
          </span>
          {(c.roles?.length ?? 0) > 0 && (
            <span style={{ fontSize: 11, color: S.textMuted, display: "block", marginTop: 1 }}>
              {(c.roles ?? []).join(" · ")}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.02em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 2, background: st.bg, color: st.color }}>
            {statusLabel(c.status)}
          </span>
          <button
            type="button"
            onClick={onEdit}
            style={{
              fontSize: 11,
              color: S.textSecondary,
              textDecoration: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Edit
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 11, color: S.textFaint, marginBottom: collabs.length ? 8 : 0 }}>
        {c.email && <span>{c.email}</span>}
        {c.last_contacted_at && <span>Last: {c.last_contacted_at}</span>}
      </div>

      {/* Collaboration chips */}
      {collabs.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {collabs.map((ch, i) => (
            <Link
              key={`${ch.kind}-${ch.id}-${i}`}
              href={
                ch.kind === "release"
                  ? `/studio?releaseId=${encodeURIComponent(ch.id)}`
                  : `/studio?catalogSongId=${encodeURIComponent(ch.id)}`
              }
              title={ch.note ? `${ch.label} — ${ch.note}` : ch.label}
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 10,
                textDecoration: "none",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 160,
                background: ch.kind === "release" ? "rgba(46,204,113,0.1)" : S.borderFaint,
                color:      ch.kind === "release" ? S.success : S.textSecondary,
                border:     `1px solid ${ch.kind === "release" ? "rgba(46,204,113,0.35)" : S.border}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {ch.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
