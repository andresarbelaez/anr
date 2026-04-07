"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Play, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CatalogSong, CatalogSongVersion, Release } from "@/lib/supabase/types";
import {
  CATALOG_MP3_BUCKET,
  safeStorageFileName,
  validateCatalogMp3File,
} from "@/lib/utils/catalog-mp3";
import { useCatalogPlayer } from "@/contexts/catalog-player-context";
import { CatalogVersionDeleteModal } from "@/components/catalog/CatalogVersionDeleteModal";

type Props = {
  songId: string;
  embedStudio?: boolean;
  onMissingSong?: () => void;
  /** After successful delete in studio — pop stack / refresh list. */
  onDeleted?: () => void;
  onLoadedMeta?: (meta: { title: string }) => void;
};

export function CatalogSongEditClient({
  songId,
  embedStudio = false,
  onMissingSong,
  onDeleted,
  onLoadedMeta,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [song, setSong] = useState<CatalogSong | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [versions, setVersions] = useState<CatalogSongVersion[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<CatalogSongVersion | null>(
    null
  );
  const [deletingVersion, setDeletingVersion] = useState(false);

  const { playCatalogVersion } = useCatalogPlayer();

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: row, error: sErr } = await supabase
      .from("catalog_songs")
      .select("*")
      .eq("id", songId)
      .maybeSingle();

    if (sErr || !row) {
      setSong(null);
      setLoading(false);
      return;
    }

    const [{ data: rels }, { data: vers }] = await Promise.all([
      supabase.from("releases").select("*").order("created_at", { ascending: false }),
      supabase
        .from("catalog_song_versions")
        .select("*")
        .eq("catalog_song_id", songId)
        .order("created_at", { ascending: true }),
    ]);

    const s = row as CatalogSong;
    setSong(s);
    onLoadedMeta?.({ title: s.title });
    setReleases((rels as Release[]) || []);
    setVersions((vers as CatalogSongVersion[]) || []);
    setLoading(false);
  }, [songId, onLoadedMeta]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!song) return;
    if (!song.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: uErr } = await supabase
      .from("catalog_songs")
      .update({
        title: song.title.trim(),
        release_id: song.release_id || null,
      })
      .eq("id", songId);

    if (uErr) setError(uErr.message);
    setSaving(false);
  };

  const handleDeleteSong = async () => {
    if (!confirm("Delete this song, all MP3 versions, and stored files?")) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();

    const { data: versRows } = await supabase
      .from("catalog_song_versions")
      .select("storage_path")
      .eq("catalog_song_id", songId);

    const paths =
      (versRows as Pick<CatalogSongVersion, "storage_path">[])?.map(
        (v) => v.storage_path
      ) || [];

    if (paths.length) {
      const { error: rmErr } = await supabase.storage
        .from(CATALOG_MP3_BUCKET)
        .remove(paths);
      if (rmErr) {
        setError(rmErr.message);
        setDeleting(false);
        return;
      }
    }

    const { error: dErr } = await supabase
      .from("catalog_songs")
      .delete()
      .eq("id", songId);

    if (dErr) {
      setError(dErr.message);
      setDeleting(false);
      return;
    }

    if (embedStudio) {
      onDeleted?.();
      if (!onDeleted) router.push("/studio?open=library");
    } else {
      router.push("/catalog");
    }
    router.refresh();
  };

  const handleUpload = async () => {
    if (!uploadFile || !song) return;
    const msg = validateCatalogMp3File(uploadFile);
    if (msg) {
      setError(msg);
      return;
    }

    setUploading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setUploading(false);
      return;
    }

    const objectName = `${crypto.randomUUID()}-${safeStorageFileName(uploadFile.name)}`;
    const storagePath = `${user.id}/${songId}/${objectName}`;

    const { error: upErr } = await supabase.storage
      .from(CATALOG_MP3_BUCKET)
      .upload(storagePath, uploadFile, {
        contentType: uploadFile.type || "audio/mpeg",
        upsert: false,
      });

    if (upErr) {
      setError(
        upErr.message.includes("Bucket not found")
          ? "Storage bucket missing. Create `catalog_mp3` in Supabase (see schema.sql comments)."
          : upErr.message
      );
      setUploading(false);
      return;
    }

    const { error: insErr } = await supabase.from("catalog_song_versions").insert({
      catalog_song_id: songId,
      label: uploadLabel.trim() || null,
      storage_path: storagePath,
      file_name: uploadFile.name,
    });

    if (insErr) {
      await supabase.storage.from(CATALOG_MP3_BUCKET).remove([storagePath]);
      setError(insErr.message);
      setUploading(false);
      return;
    }

    setUploadFile(null);
    setUploadLabel("");
    await load();
    setUploading(false);
  };

  const executeDeleteVersion = async (v: CatalogSongVersion) => {
    setDeletingVersion(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: stErr } = await supabase.storage
        .from(CATALOG_MP3_BUCKET)
        .remove([v.storage_path]);
      if (stErr) {
        setError(stErr.message);
        return;
      }
      const { error: dErr } = await supabase
        .from("catalog_song_versions")
        .delete()
        .eq("id", v.id);
      if (dErr) {
        setError(dErr.message);
        return;
      }
      setVersionToDelete(null);
      await load();
    } finally {
      setDeletingVersion(false);
    }
  };

  const handleDownload = async (v: CatalogSongVersion) => {
    const supabase = createClient();
    const { data, error: uErr } = await supabase.storage
      .from(CATALOG_MP3_BUCKET)
      .createSignedUrl(v.storage_path, 3600);

    if (uErr || !data?.signedUrl) {
      setError(uErr?.message ?? "Could not create download link.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  if (!song) {
    return (
      <div>
        <p className="text-neutral-400">Song not found.</p>
        {embedStudio ? (
          <Button
            type="button"
            variant="link"
            onClick={() => {
              onMissingSong?.();
              if (!onMissingSong) router.push("/studio?open=library");
            }}
            className="mt-4 !text-white hover:!text-neutral-200"
          >
            Back to library
          </Button>
        ) : (
          <Link href="/catalog" className="mt-4 inline-block text-white underline">
            Back to library
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
    <div>
      {!embedStudio && (
        <Link
          href="/catalog"
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to library
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Edit song</h1>
        <Button
          type="button"
          variant="danger"
          size="sm"
          loading={deleting}
          onClick={handleDeleteSong}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete song
        </Button>
      </div>

      <form onSubmit={handleSave} className="mt-8 max-w-xl space-y-4">
        {error && (
          <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <Input
          label="Title"
          value={song.title}
          onChange={(e) => setSong({ ...song, title: e.target.value })}
          required
        />
        <Select
          label="Related release (optional)"
          value={song.release_id ?? ""}
          onChange={(e) =>
            setSong({
              ...song,
              release_id: e.target.value || null,
            })
          }
          placeholder="None"
          options={releases.map((r) => ({
            value: r.id,
            label: `${r.title} (${r.status})`,
          }))}
        />
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </form>

      <section className="mt-12 max-w-2xl border-t border-neutral-800 pt-10">
        <h2 className="text-lg font-semibold text-white">MP3 versions</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Upload reference mixes, demos, or alternates. Files stay private to
          your account.
        </p>

        {versions.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No versions yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3"
              >
                <div className="text-sm">
                  <span className="font-medium text-white">
                    {v.label || v.file_name}
                  </span>
                  {v.label && (
                    <span className="ml-2 text-neutral-500">{v.file_name}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      void playCatalogVersion(
                        v.storage_path,
                        song.title,
                        v.label || v.file_name
                      )
                    }
                  >
                    <Play className="mr-1 h-3.5 w-3.5" />
                    Play
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(v)}
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setVersionToDelete(v)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 space-y-3 rounded-lg border border-neutral-800 bg-neutral-950/50 p-4">
          <Input
            label="Version label (optional)"
            placeholder="e.g. Radio edit, Demo Jan"
            value={uploadLabel}
            onChange={(e) => setUploadLabel(e.target.value)}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-300">
              MP3 file
            </label>
            <input
              type="file"
              accept=".mp3,audio/mpeg,audio/mp3"
              className="block w-full text-sm text-neutral-300 file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-4 file:py-2 file:text-white"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button
            type="button"
            disabled={!uploadFile}
            loading={uploading}
            onClick={handleUpload}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload version
          </Button>
        </div>
      </section>
    </div>

    <CatalogVersionDeleteModal
      open={versionToDelete !== null}
      onClose={() => {
        if (!deletingVersion) setVersionToDelete(null);
      }}
      onConfirm={async () => {
        if (versionToDelete) await executeDeleteVersion(versionToDelete);
      }}
      songTitle={song.title}
      versionLabel={
        versionToDelete
          ? versionToDelete.label || versionToDelete.file_name
          : ""
      }
      busy={deletingVersion}
    />
    </>
  );
}
