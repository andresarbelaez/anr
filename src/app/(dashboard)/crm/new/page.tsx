"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { CRM_STATUS_OPTIONS } from "@/lib/crm-status";
import type { CatalogSong, Release } from "@/lib/supabase/types";
import {
  CrmAddCollaborationControls,
  type CrmCollabTarget,
} from "@/components/crm/CrmAddCollaborationControls";

type PendingCollab = {
  tempId: string;
  kind: "release" | "catalog";
  targetId: string;
  displayTitle: string;
  note: string | null;
};

export default function CrmNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [lastContacted, setLastContacted] = useState("");
  const [status, setStatus] = useState("active");

  const [releases, setReleases] = useState<Release[]>([]);
  const [catalogSongs, setCatalogSongs] = useState<CatalogSong[]>([]);
  const [picklistsLoading, setPicklistsLoading] = useState(true);

  const [collabSelection, setCollabSelection] = useState<CrmCollabTarget | null>(
    null
  );
  const [linkNote, setLinkNote] = useState("");
  const [pendingCollabs, setPendingCollabs] = useState<PendingCollab[]>([]);

  const loadPicklists = useCallback(async () => {
    setPicklistsLoading(true);
    const supabase = createClient();
    const [{ data: rels }, { data: songs }] = await Promise.all([
      supabase.from("releases").select("*").order("created_at", { ascending: false }),
      supabase.from("catalog_songs").select("*").order("title"),
    ]);
    setReleases((rels as Release[]) || []);
    setCatalogSongs((songs as CatalogSong[]) || []);
    setPicklistsLoading(false);
  }, []);

  useEffect(() => {
    void loadPicklists();
  }, [loadPicklists]);

  const handleAddPendingCollab = () => {
    if (!collabSelection) return;
    setPendingCollabs((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        kind: collabSelection.kind,
        targetId: collabSelection.id,
        displayTitle: collabSelection.label,
        note: linkNote.trim() || null,
      },
    ]);
    setCollabSelection(null);
    setLinkNote("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("crm_contacts")
      .insert({
        user_id: user.id,
        name: name.trim(),
        email: email.trim() || null,
        instagram: instagram.trim() || null,
        tiktok: tiktok.trim() || null,
        role: role.trim() || null,
        notes: notes.trim() || null,
        last_contacted_at: lastContacted || null,
        status,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const contactId = data.id as string;
    const failed: string[] = [];

    for (const p of pendingCollabs) {
      const row =
        p.kind === "release"
          ? {
              contact_id: contactId,
              release_id: p.targetId,
              note: p.note,
            }
          : {
              contact_id: contactId,
              catalog_song_id: p.targetId,
              note: p.note,
            };
      const { error: cErr } = await supabase
        .from("crm_contact_collaborations")
        .insert(row);
      if (cErr) {
        failed.push(`${p.displayTitle}: ${cErr.message}`);
      }
    }

    if (failed.length) {
      window.alert(
        `Contact created. Some collaboration links could not be saved:\n\n${failed.join("\n")}\n\nYou can add or fix them on the contact page.`
      );
    }

    router.push(`/crm/${contactId}`);
    router.refresh();
  };

  return (
    <div>
      <Link
        href="/crm"
        className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CRM
      </Link>

      <h1 className="text-2xl font-bold text-white">New contact</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Add collaborations now or later — links go to releases or library songs.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-4">
        {error && (
          <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Instagram"
          placeholder="@handle or URL"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />
        <Input
          label="TikTok"
          placeholder="@handle or URL"
          value={tiktok}
          onChange={(e) => setTiktok(e.target.value)}
        />
        <Input
          label="Role"
          placeholder="e.g. Manager, Producer"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={CRM_STATUS_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        <Input
          label="Last contacted"
          type="date"
          value={lastContacted}
          onChange={(e) => setLastContacted(e.target.value)}
        />
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Free-form notes…"
        />

        <section className="border-t border-neutral-800 pt-6">
          <h2 className="text-sm font-medium text-white">Collaborations</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Optional — search releases and library songs in one list. Add
            multiple links (same title is fine with different context).
          </p>

          {pendingCollabs.length > 0 && (
            <ul className="mt-4 space-y-2">
              {pendingCollabs.map((p) => (
                <li
                  key={p.tempId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200"
                >
                  <span className="min-w-0 truncate">
                    <span className="text-neutral-500">
                      {p.kind === "release" ? "Release" : "Library"}:{" "}
                    </span>
                    {p.displayTitle}
                    {p.note ? (
                      <span className="text-neutral-500"> — {p.note}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white"
                    aria-label="Remove collaboration"
                    onClick={() =>
                      setPendingCollabs((prev) =>
                        prev.filter((x) => x.tempId !== p.tempId)
                      )
                    }
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 max-w-2xl">
            <CrmAddCollaborationControls
              releases={releases}
              catalogSongs={catalogSongs}
              selection={collabSelection}
              onSelectionChange={setCollabSelection}
              linkNote={linkNote}
              onLinkNoteChange={setLinkNote}
              onAdd={handleAddPendingCollab}
              adding={false}
              picklistsLoading={picklistsLoading}
            />
          </div>
        </section>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving}>
            Create contact
          </Button>
          <Link href="/crm">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
