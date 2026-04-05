"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CsvToolbar } from "@/components/dashboard/CsvToolbar";
import type { CrmContact, CrmContactCollaboration } from "@/lib/supabase/types";
import { CRM_STATUS_OPTIONS } from "@/lib/crm-status";
import {
  collaborationToToken,
  parseCollaborationToken,
  splitCollabTokens,
} from "@/lib/crm-collab-tokens";
import { downloadCsv, getCell, parseCsvRecords } from "@/lib/utils/csv-io";
import { CrmCollabPill } from "@/components/crm/CrmCollabPill";

type ContactCollabChip = {
  kind: "release" | "catalog";
  id: string;
  label: string;
  note: string | null;
};

const ALLOWED_STATUS = new Set(
  CRM_STATUS_OPTIONS.map((o) => o.value as string)
);

function statusLabel(value: string) {
  return CRM_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function normalizeStatus(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (ALLOWED_STATUS.has(t)) return t;
  return "active";
}

export default function CrmPage() {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [collabsByContactId, setCollabsByContactId] = useState<
    Record<string, ContactCollabChip[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [ioMessage, setIoMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const loadContacts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("crm_contacts")
      .select("*")
      .order("updated_at", { ascending: false });

    const list = (data as CrmContact[]) || [];
    setContacts(list);

    if (list.length === 0) {
      setCollabsByContactId({});
      return;
    }

    const ids = list.map((c) => c.id);
    const [{ data: collabRows }, { data: rels }, { data: songs }] =
      await Promise.all([
        supabase
          .from("crm_contact_collaborations")
          .select("*")
          .in("contact_id", ids),
        supabase.from("releases").select("id, title"),
        supabase.from("catalog_songs").select("id, title"),
      ]);

    const releaseMap = Object.fromEntries(
      ((rels as { id: string; title: string }[]) || []).map((r) => [
        r.id,
        r.title,
      ])
    );
    const songMap = Object.fromEntries(
      ((songs as { id: string; title: string }[]) || []).map((s) => [
        s.id,
        s.title,
      ])
    );

    const byContact: Record<string, ContactCollabChip[]> = {};
    for (const id of ids) byContact[id] = [];

    for (const row of (collabRows as CrmContactCollaboration[]) || []) {
      if (row.release_id) {
        byContact[row.contact_id]?.push({
          kind: "release",
          id: row.release_id,
          label: releaseMap[row.release_id] ?? "Release",
          note: row.note ?? null,
        });
      } else if (row.catalog_song_id) {
        byContact[row.contact_id]?.push({
          kind: "catalog",
          id: row.catalog_song_id,
          label: songMap[row.catalog_song_id] ?? "Library",
          note: row.note ?? null,
        });
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
    return () => {
      cancelled = true;
    };
  }, [loadContacts]);

  const handleExport = async () => {
    setExporting(true);
    setIoMessage(null);
    try {
      const supabase = createClient();
      const { data: rows, error } = await supabase
        .from("crm_contacts")
        .select("*")
        .order("name");

      if (error) throw new Error(error.message);

      const list = (rows as CrmContact[]) || [];
      const ids = list.map((c) => c.id);
      const collabTokens: Record<string, string[]> = {};

      if (ids.length) {
        const { data: collabs, error: cErr } = await supabase
          .from("crm_contact_collaborations")
          .select("*")
          .in("contact_id", ids);

        if (cErr) throw new Error(cErr.message);

        for (const row of (collabs as CrmContactCollaboration[]) || []) {
          const token = collaborationToToken(row);
          if (!token) continue;
          if (!collabTokens[row.contact_id]) collabTokens[row.contact_id] = [];
          collabTokens[row.contact_id].push(token);
        }
      }

      const exportRows = list.map((c) => ({
        name: c.name,
        email: c.email ?? "",
        instagram: c.instagram ?? "",
        tiktok: c.tiktok ?? "",
        role: c.role ?? "",
        notes: c.notes ?? "",
        last_contacted_at: c.last_contacted_at ?? "",
        status: c.status,
        collaborations: (collabTokens[c.id] || []).join(" | "),
      }));

      downloadCsv(
        `anr-crm-export-${new Date().toISOString().slice(0, 10)}.csv`,
        exportRows
      );
    } catch (e) {
      setIoMessage({
        kind: "error",
        text: e instanceof Error ? e.message : "Export failed.",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setIoMessage(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const records = await parseCsvRecords(file);
      if (records.length === 0) {
        setIoMessage({ kind: "error", text: "No rows found in CSV." });
        return;
      }

      let created = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2;
        const name = getCell(row, "name", "contact_name", "contact name");
        if (!name) {
          skipped++;
          errors.push(`Row ${rowNum}: missing name, skipped.`);
          continue;
        }

        const { data: inserted, error: insErr } = await supabase
          .from("crm_contacts")
          .insert({
            user_id: user.id,
            name,
            email: getCell(row, "email", "e-mail") || null,
            instagram: getCell(row, "instagram", "ig") || null,
            tiktok: getCell(row, "tiktok", "tik_tok") || null,
            role: getCell(row, "role") || null,
            notes: getCell(row, "notes", "note") || null,
            last_contacted_at: getCell(
              row,
              "last_contacted_at",
              "last_contacted",
              "last contacted"
            ) || null,
            status: normalizeStatus(getCell(row, "status") || "active"),
          })
          .select("id")
          .single();

        if (insErr || !inserted) {
          skipped++;
          errors.push(`Row ${rowNum}: ${insErr?.message ?? "insert failed"}`);
          continue;
        }

        created++;
        const contactId = inserted.id as string;
        const collabRaw = getCell(
          row,
          "collaborations",
          "collaboration",
          "links"
        );
        if (!collabRaw) continue;

        for (const token of splitCollabTokens(collabRaw)) {
          const parsed = parseCollaborationToken(token);
          if (!parsed) {
            errors.push(`Row ${rowNum}: ignored collaboration token "${token}"`);
            continue;
          }
          const payload =
            parsed.kind === "release"
              ? {
                  contact_id: contactId,
                  release_id: parsed.id,
                  note: parsed.note,
                }
              : {
                  contact_id: contactId,
                  catalog_song_id: parsed.id,
                  note: parsed.note,
                };
          const { error: cErr } = await supabase
            .from("crm_contact_collaborations")
            .insert(payload);
          if (cErr) {
            errors.push(
              `Row ${rowNum}: collaboration "${token}" — ${cErr.message}`
            );
          }
        }
      }

      await loadContacts();

      const parts = [`Imported ${created} contact(s).`];
      if (skipped) parts.push(`${skipped} row(s) skipped.`);
      if (errors.length) parts.push(errors.slice(0, 8).join(" "));
      if (errors.length > 8) parts.push(`…and ${errors.length - 8} more.`);

      setIoMessage({
        kind: errors.length && created === 0 ? "error" : "success",
        text: parts.join(" "),
      });
    } catch (e) {
      setIoMessage({
        kind: "error",
        text: e instanceof Error ? e.message : "Import failed.",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Contacts and relationships for your artist work
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CsvToolbar
            onExport={handleExport}
            onImportFile={handleImport}
            exporting={exporting}
            importing={importing}
            exportFilenameHint="crm"
          />
          <Link href="/crm/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New contact
            </Button>
          </Link>
        </div>
      </div>

      <p className="mt-3 max-w-2xl text-xs text-neutral-500">
        CSV import creates new contacts. Optional{" "}
        <code className="text-neutral-400">collaborations</code> column: tokens
        like <code className="text-neutral-400">release:UUID</code> or{" "}
        <code className="text-neutral-400">catalog:UUID</code>, optionally{" "}
        <code className="text-neutral-400">|||context text</code> per token.
        Separate multiple tokens with <code className="text-neutral-400">
          {" | "}
        </code>{" "}
        (space-pipe-space). You can link the same release or song more than
        once with different context lines.
      </p>

      {ioMessage && (
        <p
          className={
            ioMessage.kind === "success"
              ? "mt-4 text-sm text-green-400/90"
              : "mt-4 text-sm text-red-300"
          }
        >
          {ioMessage.text}
        </p>
      )}

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900">
            <Users className="h-8 w-8 text-neutral-600" />
          </div>
          <h2 className="mt-4 text-lg font-medium text-white">No contacts yet</h2>
          <p className="mt-1 max-w-sm text-sm text-neutral-400">
            Track collaborators, managers, and other relationships. Link them
            to releases or library songs when you work together.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <CsvToolbar
              onExport={handleExport}
              onImportFile={handleImport}
              exporting={exporting}
              importing={importing}
              exportFilenameHint="crm"
            />
            <Link href="/crm/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add your first contact
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-neutral-800 bg-neutral-950 text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Collaborations</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last contacted</th>
                <th className="w-24 px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-900/50">
                  <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3 text-neutral-300">
                    {c.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {c.role ?? "—"}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    {(collabsByContactId[c.id] ?? []).length === 0 ? (
                      <span className="text-neutral-500">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(collabsByContactId[c.id] ?? []).map((ch, i) => (
                          <CrmCollabPill
                            key={`${c.id}-${ch.kind}-${ch.id}-${i}`}
                            kind={ch.kind}
                            href={
                              ch.kind === "release"
                                ? `/releases/${ch.id}`
                                : `/catalog/${ch.id}`
                            }
                            title={
                              ch.note
                                ? `${ch.label} — ${ch.note}`
                                : ch.label
                            }
                          >
                            {ch.label}
                          </CrmCollabPill>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {statusLabel(c.status)}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {c.last_contacted_at ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/crm/${c.id}`}
                      className="text-white underline-offset-2 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
