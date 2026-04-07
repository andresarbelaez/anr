"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type {
  CrmContact,
  CrmContactCollaboration,
  Release,
  CatalogSong,
} from "@/lib/supabase/types";
import { CRM_STATUS_OPTIONS } from "@/lib/crm-status";
import {
  CrmAddCollaborationControls,
  type CrmCollabTarget,
} from "@/components/crm/CrmAddCollaborationControls";
import { CrmCollabPill } from "@/components/crm/CrmCollabPill";

type CollabRow = CrmContactCollaboration & {
  releaseTitle?: string;
  catalogTitle?: string;
};

type Props = {
  contactId: string;
  embedStudio?: boolean;
  /** Collaboration pills link into studio deep routes instead of legacy pages. */
  studioCollabLinks?: boolean;
  onMissingContact?: () => void;
  onDeleted?: () => void;
  onLoadedMeta?: (meta: { name: string }) => void;
};

export function CrmContactEditClient({
  contactId,
  embedStudio = false,
  studioCollabLinks = false,
  onMissingContact,
  onDeleted,
  onLoadedMeta,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contact, setContact] = useState<CrmContact | null>(null);
  const [collabs, setCollabs] = useState<CollabRow[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [catalogSongs, setCatalogSongs] = useState<CatalogSong[]>([]);

  const [collabSelection, setCollabSelection] = useState<CrmCollabTarget | null>(
    null
  );
  const [linkNote, setLinkNote] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: row, error: cErr } = await supabase
      .from("crm_contacts")
      .select("*")
      .eq("id", contactId)
      .maybeSingle();

    if (cErr || !row) {
      setContact(null);
      setLoading(false);
      return;
    }

    const c = row as CrmContact;
    setContact(c);
    onLoadedMeta?.({ name: c.name });

    const [{ data: collabRows }, { data: rels }, { data: songs }] =
      await Promise.all([
        supabase
          .from("crm_contact_collaborations")
          .select("*")
          .eq("contact_id", contactId)
          .order("created_at", { ascending: true }),
        supabase.from("releases").select("*").order("created_at", { ascending: false }),
        supabase.from("catalog_songs").select("*").order("title"),
      ]);

    const releaseMap = Object.fromEntries(
      ((rels as Release[]) || []).map((r) => [r.id, r.title])
    );
    const songMap = Object.fromEntries(
      ((songs as CatalogSong[]) || []).map((s) => [s.id, s.title])
    );

    const enriched: CollabRow[] =
      (collabRows as CrmContactCollaboration[])?.map((col) => ({
        ...col,
        note: col.note ?? null,
        created_at: col.created_at ?? new Date().toISOString(),
        releaseTitle: col.release_id ? releaseMap[col.release_id] : undefined,
        catalogTitle: col.catalog_song_id ? songMap[col.catalog_song_id] : undefined,
      })) || [];

    enriched.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    setCollabs(enriched);
    setReleases((rels as Release[]) || []);
    setCatalogSongs((songs as CatalogSong[]) || []);
    setLoading(false);
  }, [contactId, onLoadedMeta]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;
    if (!contact.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: uErr } = await supabase
      .from("crm_contacts")
      .update({
        name: contact.name.trim(),
        email: contact.email?.trim() || null,
        instagram: contact.instagram?.trim() || null,
        tiktok: contact.tiktok?.trim() || null,
        role: contact.role?.trim() || null,
        notes: contact.notes?.trim() || null,
        last_contacted_at: contact.last_contacted_at || null,
        status: contact.status,
      })
      .eq("id", contactId);

    if (uErr) setError(uErr.message);
    setSaving(false);
  };

  const handleDeleteContact = async () => {
    if (!confirm("Delete this contact and all collaboration links?")) return;
    setDeleting(true);
    const supabase = createClient();
    const { error: dErr } = await supabase
      .from("crm_contacts")
      .delete()
      .eq("id", contactId);
    if (dErr) {
      setError(dErr.message);
      setDeleting(false);
      return;
    }
    if (embedStudio) {
      onDeleted?.();
      if (!onDeleted) router.push("/studio?open=crm");
    } else {
      router.push("/crm");
    }
    router.refresh();
  };

  const handleAddLink = async () => {
    if (!collabSelection) return;
    setLinkSaving(true);
    setError(null);
    const supabase = createClient();
    const note = linkNote.trim() || null;
    const row =
      collabSelection.kind === "release"
        ? { contact_id: contactId, release_id: collabSelection.id, note }
        : { contact_id: contactId, catalog_song_id: collabSelection.id, note };

    const { error: iErr } = await supabase
      .from("crm_contact_collaborations")
      .insert(row);

    if (iErr) {
      setError(iErr.message);
      setLinkSaving(false);
      return;
    }
    setCollabSelection(null);
    setLinkNote("");
    await load();
    setLinkSaving(false);
  };

  const handleRemoveLink = async (collabRowId: string) => {
    const supabase = createClient();
    await supabase.from("crm_contact_collaborations").delete().eq("id", collabRowId);
    await load();
  };

  const saveCollabNote = async (
    collabRowId: string,
    value: string,
    previous: string | null | undefined
  ) => {
    const next = value.trim() || null;
    const prev = previous?.trim() || null;
    if (next === prev) return;
    setError(null);
    const supabase = createClient();
    const { error: uErr } = await supabase
      .from("crm_contact_collaborations")
      .update({ note: next })
      .eq("id", collabRowId);
    if (uErr) setError(uErr.message);
    else await load();
  };

  const releaseHref = (rid: string) =>
    studioCollabLinks
      ? `/studio?releaseId=${encodeURIComponent(rid)}`
      : `/releases/${rid}`;
  const catalogHref = (sid: string) =>
    studioCollabLinks
      ? `/studio?catalogSongId=${encodeURIComponent(sid)}`
      : `/catalog/${sid}`;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div>
        <p className="text-neutral-400">Contact not found.</p>
        {embedStudio ? (
          <button
            type="button"
            onClick={() => {
              onMissingContact?.();
              if (!onMissingContact) router.push("/studio?open=crm");
            }}
            className="mt-4 text-sm text-white underline"
          >
            Back to CRM
          </button>
        ) : (
          <Link href="/crm" className="mt-4 inline-block text-white underline">
            Back to CRM
          </Link>
        )}
      </div>
    );
  }

  return (
    <div>
      {!embedStudio && (
        <Link
          href="/crm"
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to CRM
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Edit contact</h1>
        <Button
          type="button"
          variant="danger"
          size="sm"
          loading={deleting}
          onClick={handleDeleteContact}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete contact
        </Button>
      </div>

      <form onSubmit={handleSave} className="mt-8 max-w-xl space-y-4">
        {error && (
          <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <Input
          label="Name"
          value={contact.name}
          onChange={(e) => setContact({ ...contact, name: e.target.value })}
          required
        />
        <Input
          label="Email"
          type="email"
          value={contact.email ?? ""}
          onChange={(e) =>
            setContact({ ...contact, email: e.target.value || null })
          }
        />
        <Input
          label="Instagram"
          value={contact.instagram ?? ""}
          onChange={(e) =>
            setContact({ ...contact, instagram: e.target.value || null })
          }
        />
        <Input
          label="TikTok"
          value={contact.tiktok ?? ""}
          onChange={(e) =>
            setContact({ ...contact, tiktok: e.target.value || null })
          }
        />
        <Input
          label="Role"
          value={contact.role ?? ""}
          onChange={(e) =>
            setContact({ ...contact, role: e.target.value || null })
          }
        />
        <Select
          label="Status"
          value={contact.status}
          onChange={(e) =>
            setContact({ ...contact, status: e.target.value })
          }
          options={CRM_STATUS_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        <Input
          label="Last contacted"
          type="date"
          value={contact.last_contacted_at ?? ""}
          onChange={(e) =>
            setContact({
              ...contact,
              last_contacted_at: e.target.value || null,
            })
          }
        />
        <Textarea
          label="Notes"
          value={contact.notes ?? ""}
          onChange={(e) =>
            setContact({ ...contact, notes: e.target.value || null })
          }
        />
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </form>

      <section className="mt-12 max-w-2xl border-t border-neutral-800 pt-10">
        <h2 className="text-lg font-semibold text-white">Collaborations</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Search your releases and library in one picker. Add as many links as
          you need — including duplicates with different context (session,
          role, date).
        </p>

        {collabs.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No links yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {collabs.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1 text-sm text-neutral-200">
                  {c.release_id && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-neutral-500">Release</span>
                      <CrmCollabPill
                        kind="release"
                        href={releaseHref(c.release_id)}
                        title={
                          c.note
                            ? `${c.releaseTitle ?? c.release_id} — ${c.note}`
                            : (c.releaseTitle ?? undefined)
                        }
                      >
                        {c.releaseTitle ?? c.release_id}
                      </CrmCollabPill>
                    </div>
                  )}
                  {c.catalog_song_id && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 sm:mt-0">
                      <span className="text-neutral-500">Library</span>
                      <CrmCollabPill
                        kind="catalog"
                        href={catalogHref(c.catalog_song_id)}
                        title={
                          c.note
                            ? `${c.catalogTitle ?? c.catalog_song_id} — ${c.note}`
                            : (c.catalogTitle ?? undefined)
                        }
                      >
                        {c.catalogTitle ?? c.catalog_song_id}
                      </CrmCollabPill>
                    </div>
                  )}
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-72">
                  <Input
                    placeholder="Context (session, role, date…)"
                    className="h-9 text-xs"
                    defaultValue={c.note ?? ""}
                    key={`${c.id}-${c.note ?? ""}`}
                    onBlur={(e) =>
                      void saveCollabNote(c.id, e.target.value, c.note)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-end text-red-400 hover:text-red-300"
                    onClick={() => handleRemoveLink(c.id)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 max-w-2xl">
          <CrmAddCollaborationControls
            releases={releases}
            catalogSongs={catalogSongs}
            selection={collabSelection}
            onSelectionChange={setCollabSelection}
            linkNote={linkNote}
            onLinkNoteChange={setLinkNote}
            onAdd={handleAddLink}
            adding={linkSaving}
          />
        </div>
      </section>
    </div>
  );
}
