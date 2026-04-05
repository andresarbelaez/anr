"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ListMusic, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CsvToolbar } from "@/components/dashboard/CsvToolbar";
import type { CatalogSong, CatalogSongVersion, Release } from "@/lib/supabase/types";
import {
  downloadCsv,
  getCell,
  isUuid,
  parseCsvRecords,
} from "@/lib/utils/csv-io";
import { useCatalogPlayer } from "@/contexts/catalog-player-context";
import { FeedbackShareModal } from "@/components/feedback/FeedbackShareModal";

type SongRow = CatalogSong & { releaseTitle: string | null };

export default function CatalogPage() {
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [versionsBySong, setVersionsBySong] = useState<
    Record<string, CatalogSongVersion[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [ioMessage, setIoMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const loadCatalog = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSongs([]);
      setVersionsBySong({});
      return;
    }

    const { data: songRows } = await supabase
      .from("catalog_songs")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    const songsData = (songRows as CatalogSong[]) || [];
    const releaseIds = [
      ...new Set(songsData.map((s) => s.release_id).filter(Boolean)),
    ] as string[];

    let releaseMap: Record<string, string> = {};
    if (releaseIds.length) {
      const { data: rels } = await supabase
        .from("releases")
        .select("id,title")
        .in("id", releaseIds);
      releaseMap = Object.fromEntries(
        ((rels as Pick<Release, "id" | "title">[]) || []).map((r) => [
          r.id,
          r.title,
        ])
      );
    }

    const withTitles: SongRow[] = songsData.map((s) => ({
      ...s,
      releaseTitle: s.release_id ? releaseMap[s.release_id] ?? null : null,
    }));

    const songIds = songsData.map((s) => s.id);
    const versMap: Record<string, CatalogSongVersion[]> = {};
    if (songIds.length) {
      const { data: vers } = await supabase
        .from("catalog_song_versions")
        .select("*")
        .in("catalog_song_id", songIds)
        .order("created_at", { ascending: true });

      for (const v of (vers as CatalogSongVersion[]) || []) {
        if (!versMap[v.catalog_song_id]) versMap[v.catalog_song_id] = [];
        versMap[v.catalog_song_id].push(v);
      }
    }

    setSongs(withTitles);
    setVersionsBySong(versMap);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadCatalog();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCatalog]);

  const empty = useMemo(() => songs.length === 0, [songs.length]);
  const { playCatalogVersion } = useCatalogPlayer();
  const [shareVersion, setShareVersion] = useState<{
    versionId: string;
    songTitle: string;
    versionLabel: string;
  } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setIoMessage(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const { data: songRows, error } = await supabase
        .from("catalog_songs")
        .select("*")
        .eq("user_id", user.id)
        .order("title");

      if (error) throw new Error(error.message);

      const songsData = (songRows as CatalogSong[]) || [];
      const releaseIds = [
        ...new Set(songsData.map((s) => s.release_id).filter(Boolean)),
      ] as string[];

      let releaseMap: Record<string, string> = {};
      if (releaseIds.length) {
        const { data: rels } = await supabase
          .from("releases")
          .select("id,title")
          .in("id", releaseIds);
        releaseMap = Object.fromEntries(
          ((rels as Pick<Release, "id" | "title">[]) || []).map((r) => [
            r.id,
            r.title,
          ])
        );
      }

      const songIds = songsData.map((s) => s.id);
      const versMap: Record<string, CatalogSongVersion[]> = {};
      if (songIds.length) {
        const { data: vers } = await supabase
          .from("catalog_song_versions")
          .select("*")
          .in("catalog_song_id", songIds)
          .order("created_at", { ascending: true });

        for (const v of (vers as CatalogSongVersion[]) || []) {
          if (!versMap[v.catalog_song_id]) versMap[v.catalog_song_id] = [];
          versMap[v.catalog_song_id].push(v);
        }
      }

      const exportRows = songsData.map((s) => {
        const vers = versMap[s.id] || [];
        const versionsPayload = vers.map((v) => ({
          label: v.label,
          file_name: v.file_name,
        }));
        return {
          title: s.title,
          release_id: s.release_id ?? "",
          release_title: s.release_id
            ? releaseMap[s.release_id] ?? ""
            : "",
          versions_json: JSON.stringify(versionsPayload),
        };
      });

      downloadCsv(
        `anr-catalog-export-${new Date().toISOString().slice(0, 10)}.csv`,
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

      const { data: rels } = await supabase
        .from("releases")
        .select("id,title")
        .eq("user_id", user.id);

      const titleToReleaseId = new Map<string, string>();
      for (const r of (rels as Pick<Release, "id" | "title">[]) || []) {
        titleToReleaseId.set(r.title.trim().toLowerCase(), r.id);
      }

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
        const title = getCell(row, "title", "song", "song_title", "name");
        if (!title) {
          skipped++;
          errors.push(`Row ${rowNum}: missing title, skipped.`);
          continue;
        }

        let releaseId: string | null = null;
        const ridRaw = getCell(row, "release_id", "release id");
        if (ridRaw && isUuid(ridRaw)) {
          const ok = (rels as Release[] | null)?.some((r) => r.id === ridRaw);
          if (ok) releaseId = ridRaw;
          else
            errors.push(
              `Row ${rowNum}: release_id not found for your account, ignored.`
            );
        }
        if (!releaseId) {
          const rt = getCell(row, "release_title", "release", "album");
          if (rt) {
            releaseId = titleToReleaseId.get(rt.trim().toLowerCase()) ?? null;
            if (!releaseId) {
              errors.push(
                `Row ${rowNum}: no release titled "${rt}", leaving unlinked.`
              );
            }
          }
        }

        const { error: insErr } = await supabase.from("catalog_songs").insert({
          user_id: user.id,
          title,
          release_id: releaseId,
        });

        if (insErr) {
          skipped++;
          errors.push(`Row ${rowNum}: ${insErr.message}`);
          continue;
        }
        created++;
      }

      await loadCatalog();

      const parts = [`Imported ${created} song(s).`];
      if (skipped) parts.push(`${skipped} row(s) skipped.`);
      parts.push(
        "MP3 versions are not created from CSV — upload files on each song’s edit page."
      );
      if (errors.length) parts.push(errors.slice(0, 6).join(" "));
      if (errors.length > 6) parts.push(`…and ${errors.length - 6} more.`);

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
          <h1 className="text-2xl font-bold text-white">Library</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Songs and MP3 versions separate from distribution releases. Click a
            version to play it in the bar at the bottom of this column.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CsvToolbar
            onExport={handleExport}
            onImportFile={handleImport}
            exporting={exporting}
            importing={importing}
            exportFilenameHint="catalog"
          />
          <Link href="/catalog/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New song
            </Button>
          </Link>
        </div>
      </div>

      <p className="mt-3 max-w-2xl text-xs text-neutral-500">
        Export includes <code className="text-neutral-400">versions_json</code>{" "}
        (labels + file names only). Import creates songs only; use{" "}
        <code className="text-neutral-400">release_id</code> or{" "}
        <code className="text-neutral-400">release_title</code> to link a
        release (title must match one of yours).
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
      ) : empty ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900">
            <ListMusic className="h-8 w-8 text-neutral-600" />
          </div>
          <h2 className="mt-4 text-lg font-medium text-white">No songs yet</h2>
          <p className="mt-1 max-w-sm text-sm text-neutral-400">
            Track demos, alternates, and references. Link a row to a release
            when it relates to something you are distributing.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <CsvToolbar
              onExport={handleExport}
              onImportFile={handleImport}
              exporting={exporting}
              importing={importing}
              exportFilenameHint="catalog"
            />
            <Link href="/catalog/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add a song
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-neutral-800 bg-neutral-950 text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Release</th>
                <th className="px-4 py-3 font-medium">Versions</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {songs.map((s) => {
                const vers = versionsBySong[s.id] || [];
                return (
                  <tr key={s.id} className="hover:bg-neutral-900/50">
                    <td className="px-4 py-3 font-medium text-white">
                      {s.title}
                    </td>
                    <td className="px-4 py-3 text-neutral-300">
                      {s.releaseTitle ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-300">
                      {vers.length === 0 ? (
                        <span className="text-neutral-500">None</span>
                      ) : (
                        <ul className="max-w-xs space-y-1 text-xs">
                          {vers.map((v) => {
                            const label = v.label || v.file_name;
                            return (
                              <li key={v.id} className="space-y-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void playCatalogVersion(
                                        v.storage_path,
                                        s.title,
                                        label
                                      )
                                    }
                                    className="group flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-0.5 text-left text-neutral-300 transition hover:bg-neutral-800/80 hover:text-white"
                                  >
                                    <Play className="h-3 w-3 shrink-0 text-neutral-500 opacity-70 group-hover:text-white group-hover:opacity-100" />
                                    <span className="min-w-0 truncate">
                                      {v.label ? (
                                        <span className="text-neutral-200">
                                          {v.label}
                                        </span>
                                      ) : (
                                        <span className="text-neutral-400">
                                          {v.file_name}
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShareVersion({
                                        versionId: v.id,
                                        songTitle: s.title,
                                        versionLabel: label,
                                      })
                                    }
                                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-pink-400/90 transition hover:bg-pink-950/40 hover:text-pink-300"
                                  >
                                    Ask for feedback
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {new Date(s.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/catalog/${s.id}`}
                        className="text-white underline-offset-2 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {shareVersion && (
        <FeedbackShareModal
          open
          onClose={() => setShareVersion(null)}
          catalogSongVersionId={shareVersion.versionId}
          songTitle={shareVersion.songTitle}
          versionLabel={shareVersion.versionLabel}
        />
      )}
    </div>
  );
}
