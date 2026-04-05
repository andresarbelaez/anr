"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

type CollabRow = CrmContactCollaboration & {
  releaseTitle?: string;
  catalogTitle?: string;
};

export default function CrmEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contact, setContact] = useState<CrmContact | null>(null);
  const [collabs, setCollabs] = useState<CollabRow[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [catalogSongs, setCatalogSongs] = useState<CatalogSong[]>([]);

  const [linkKind, setLinkKind] = useState<"release" | "catalog">("release");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: row, error: cErr } = await supabase
      .from("crm_contacts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (cErr || !row) {
      setContact(null);
      setLoading(false);
      return;
    }

    setContact(row as CrmContact);

    const [{ data: collabRows }, { data: rels }, { data: songs }] =
      await Promise.all([
        supabase.from("crm_contact_collaborations").select("*").eq("contact_id", id),
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
      (collabRows as CrmContactCollaboration[])?.map((c) => ({
        ...c,
        releaseTitle: c.release_id ? releaseMap[c.release_id] : undefined,
        catalogTitle: c.catalog_song_id ? songMap[c.catalog_song_id] : undefined,
      })) || [];

    setCollabs(enriched);
    setReleases((rels as Release[]) || []);
    setCatalogSongs((songs as CatalogSong[]) || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
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
      .eq("id", id);

    if (uErr) setError(uErr.message);
    setSaving(false);
  };

  const handleDeleteContact = async () => {
    if (!confirm("Delete this contact and all collaboration links?")) return;
    setDeleting(true);
    const supabase = createClient();
    const { error: dErr } = await supabase.from("crm_contacts").delete().eq("id", id);
    if (dErr) {
      setError(dErr.message);
      setDeleting(false);
      return;
    }
    router.push("/crm");
    router.refresh();
  };

  const handleAddLink = async () => {
    if (!linkTargetId) return;
    setLinkSaving(true);
    setError(null);
    const supabase = createClient();
    const row =
      linkKind === "release"
        ? { contact_id: id, release_id: linkTargetId }
        : { contact_id: id, catalog_song_id: linkTargetId };

    const { error: iErr } = await supabase
      .from("crm_contact_collaborations")
      .insert(row);

    if (iErr) {
      setError(iErr.message);
      setLinkSaving(false);
      return;
    }
    setLinkTargetId("");
    await load();
    setLinkSaving(false);
  };

  const handleRemoveLink = async (collabId: string) => {
    const supabase = createClient();
    await supabase.from("crm_contact_collaborations").delete().eq("id", collabId);
    await load();
  };

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
        <Link href="/crm" className="mt-4 inline-block text-white underline">
          Back to CRM
        </Link>
      </div>
    );
  }

  const releaseOptions = releases.map((r) => ({
    value: r.id,
    label: `${r.title} (${r.status})`,
  }));
  const catalogOptions = catalogSongs.map((s) => ({
    value: s.id,
    label: s.title,
  }));

  const linkedReleaseIds = new Set(
    collabs.filter((c) => c.release_id).map((c) => c.release_id as string)
  );
  const linkedSongIds = new Set(
    collabs.filter((c) => c.catalog_song_id).map((c) => c.catalog_song_id as string)
  );

  const filteredReleaseOptions = releaseOptions.filter(
    (o) => !linkedReleaseIds.has(o.value)
  );
  const filteredCatalogOptions = catalogOptions.filter(
    (o) => !linkedSongIds.has(o.value)
  );

  return (
    <div>
      <Link
        href="/crm"
        className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CRM
      </Link>

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
          Link this contact to a release or a catalog song you worked on
          together.
        </p>

        {collabs.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No links yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {collabs.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3"
              >
                <div className="text-sm text-neutral-200">
                  {c.release_id && (
                    <span>
                      Release:{" "}
                      <Link
                        href={`/releases/${c.release_id}`}
                        className="text-white underline-offset-2 hover:underline"
                      >
                        {c.releaseTitle ?? c.release_id}
                      </Link>
                    </span>
                  )}
                  {c.catalog_song_id && (
                    <span>
                      Catalog:{" "}
                      <Link
                        href={`/catalog/${c.catalog_song_id}`}
                        className="text-white underline-offset-2 hover:underline"
                      >
                        {c.catalogTitle ?? c.catalog_song_id}
                      </Link>
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => handleRemoveLink(c.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Select
            label="Link type"
            value={linkKind}
            onChange={(e) =>
              setLinkKind(e.target.value as "release" | "catalog")
            }
            options={[
              { value: "release", label: "Release" },
              { value: "catalog", label: "Catalog song" },
            ]}
          />
          <div className="min-w-[220px] flex-1">
            {linkKind === "release" ? (
              <Select
                label="Release"
                value={linkTargetId}
                onChange={(e) => setLinkTargetId(e.target.value)}
                placeholder="Choose release"
                options={filteredReleaseOptions}
              />
            ) : (
              <Select
                label="Catalog song"
                value={linkTargetId}
                onChange={(e) => setLinkTargetId(e.target.value)}
                placeholder="Choose song"
                options={filteredCatalogOptions}
              />
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={
              !linkTargetId ||
              (linkKind === "release" && filteredReleaseOptions.length === 0) ||
              (linkKind === "catalog" && filteredCatalogOptions.length === 0)
            }
            loading={linkSaving}
            onClick={handleAddLink}
          >
            Add link
          </Button>
        </div>
      </section>
    </div>
  );
}
