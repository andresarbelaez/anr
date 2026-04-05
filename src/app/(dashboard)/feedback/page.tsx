"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  CatalogSong,
  CatalogSongVersion,
  FeedbackVersionLink,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils/cn";

type LinkRow = FeedbackVersionLink & {
  catalog_song_versions: CatalogSongVersion & {
    catalog_songs: Pick<CatalogSong, "title"> | null;
  };
};

type RowUi = {
  versionId: string;
  songTitle: string;
  versionLabel: string;
  enabled: boolean;
  commentCount: number;
};

export default function FeedbackListPage() {
  const [rows, setRows] = useState<RowUi[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      return;
    }

    const { data: links, error } = await supabase
      .from("feedback_version_links")
      .select(
        `
        id,
        enabled,
        token,
        catalog_song_version_id,
        catalog_song_versions (
          id,
          label,
          file_name,
          catalog_songs ( title )
        )
      `
      )
      .order("updated_at", { ascending: false });

    if (error || !links) {
      setRows([]);
      return;
    }

    const parsed = links as unknown as LinkRow[];
    const counts = await Promise.all(
      parsed.map(async (l) => {
        const { count } = await supabase
          .from("feedback_comments")
          .select("*", { count: "exact", head: true })
          .eq("feedback_link_id", l.id);
        const v = l.catalog_song_versions;
        const versionLabel = (v?.label?.trim() || v?.file_name || "Version").trim();
        const songTitle = v?.catalog_songs?.title ?? "Untitled";
        return {
          versionId: l.catalog_song_version_id,
          songTitle,
          versionLabel,
          enabled: l.enabled,
          commentCount: count ?? 0,
        };
      })
    );

    setRows(counts);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Feedback</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Time-stamped notes from people you share demo links with. Create
            links from Library → Versions → Ask for feedback.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900">
            <MessageSquare className="h-8 w-8 text-neutral-600" />
          </div>
          <h2 className="mt-4 text-lg font-medium text-white">
            No feedback yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-neutral-400">
            Open a song in Library and use &quot;Ask for feedback&quot; on a
            version to get a shareable link.
          </p>
          <Link
            href="/catalog"
            className="mt-6 text-sm text-white underline-offset-2 hover:underline"
          >
            Go to Library
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {rows.map((r) => (
            <Link
              key={r.versionId}
              href={`/feedback/${r.versionId}`}
              className={cn(
                "flex items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-4 transition hover:border-neutral-700 hover:bg-neutral-900/40"
              )}
            >
              <div className="min-w-0 text-left">
                <p className="truncate font-medium text-white">
                  {r.songTitle}
                </p>
                <p className="truncate text-sm text-neutral-500">
                  {r.versionLabel}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    r.enabled
                      ? "bg-green-950/80 text-green-300"
                      : "bg-neutral-800 text-neutral-400"
                  )}
                >
                  {r.enabled ? "Link enabled" : "Link disabled"}
                </span>
                <span className="text-sm tabular-nums text-neutral-400">
                  {r.commentCount}{" "}
                  {r.commentCount === 1 ? "comment" : "comments"}
                </span>
                <ChevronRight className="h-5 w-5 text-neutral-600" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
