"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ListMusic } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { CatalogSong, CatalogSongVersion, Release } from "@/lib/supabase/types";

type SongRow = CatalogSong & { releaseTitle: string | null };

export default function CatalogPage() {
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [versionsBySong, setVersionsBySong] = useState<
    Record<string, CatalogSongVersion[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
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
      setLoading(false);
    }
    load();
  }, []);

  const empty = useMemo(() => songs.length === 0, [songs.length]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Catalog</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Songs and MP3 versions separate from distribution releases
          </p>
        </div>
        <Link href="/catalog/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New song
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
        </div>
      ) : empty ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900">
            <ListMusic className="h-8 w-8 text-neutral-600" />
          </div>
          <h2 className="mt-4 text-lg font-medium text-white">No catalog songs</h2>
          <p className="mt-1 max-w-sm text-sm text-neutral-400">
            Track demos, alternates, and references. Link a row to a release
            when it relates to something you are distributing.
          </p>
          <Link href="/catalog/new" className="mt-6">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add a song
            </Button>
          </Link>
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
                        <ul className="max-w-xs list-inside list-disc space-y-0.5 text-xs">
                          {vers.map((v) => (
                            <li key={v.id}>
                              {v.label ? (
                                <span className="text-neutral-200">
                                  {v.label}
                                </span>
                              ) : (
                                <span className="text-neutral-400">
                                  {v.file_name}
                                </span>
                              )}
                            </li>
                          ))}
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
    </div>
  );
}
