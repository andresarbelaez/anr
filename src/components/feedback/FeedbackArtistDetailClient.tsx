"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MicroappAudioPlayerBarHandle } from "@/components/audio/MicroappAudioPlayerBar";
import { MicroappAudioPlayerBar } from "@/components/audio/MicroappAudioPlayerBar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pause, Play, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  invalidateFeedbackArtistDetailCache,
  readFeedbackArtistDetailCache,
  writeFeedbackArtistDetailCache,
} from "@/lib/feedback/feedback-artist-detail-cache";
import {
  buildCommentTree,
  type FeedbackCommentRow,
} from "@/lib/feedback/build-comment-tree";
import type { PublicFeedbackRootJson } from "@/lib/feedback/types";
import { formatAudioTime } from "@/lib/utils/format-audio-time";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { FeedbackShareModal } from "@/components/feedback/FeedbackShareModal";

type VersionRow = {
  id: string;
  label: string | null;
  file_name: string;
  storage_path: string;
  catalog_songs: { id: string; title: string } | null;
};

export function FeedbackArtistDetailClient({
  versionId,
  embedStudio = false,
  onMissingVersion,
  onLoadedMeta,
}: {
  versionId: string;
  /** Hide in-page back link; studio uses window chrome chevrons. */
  embedStudio?: boolean;
  /** When `embedStudio` and the version cannot be loaded. */
  onMissingVersion?: () => void;
  /** Fired when version row is resolved (for studio title bar, etc.). */
  onLoadedMeta?: (meta: { songTitle: string; versionLabel: string }) => void;
}) {
  const router = useRouter();
  const idPrefix = useId();
  const audioRef = useRef<HTMLAudioElement>(null);
  const embeddedPlayerRef = useRef<MicroappAudioPlayerBarHandle>(null);

  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState<VersionRow | null>(null);
  const [linkRow, setLinkRow] = useState<{
    id: string;
    token: string;
    enabled: boolean;
  } | null>(null);
  const [comments, setComments] = useState<PublicFeedbackRootJson[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const versionLabel =
    version?.label?.trim() || version?.file_name || "Version";

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    const supabase = createClient();
    const { data: v, error: vErr } = await supabase
      .from("catalog_song_versions")
      .select(
        `
        id,
        label,
        file_name,
        storage_path,
        catalog_songs ( id, title )
      `
      )
      .eq("id", versionId)
      .maybeSingle();

    if (vErr || !v) {
      setVersion(null);
      invalidateFeedbackArtistDetailCache(versionId);
      if (!opts?.silent) setLoading(false);
      return;
    }

    const raw = v as {
      id: string;
      label: string | null;
      file_name: string;
      storage_path: string;
      catalog_songs:
        | { id: string; title: string }
        | { id: string; title: string }[]
        | null;
    };
    const song = Array.isArray(raw.catalog_songs)
      ? raw.catalog_songs[0] ?? null
      : raw.catalog_songs;
    const row: VersionRow = {
      id: raw.id,
      label: raw.label,
      file_name: raw.file_name,
      storage_path: raw.storage_path,
      catalog_songs: song,
    };
    setVersion(row);
    const songTitleForMeta = song?.title ?? "Untitled";
    const versionLabelForMeta =
      row.label?.trim() || row.file_name || "Version";
    onLoadedMeta?.({
      songTitle: songTitleForMeta,
      versionLabel: versionLabelForMeta,
    });

    const [linkRes, audioRes] = await Promise.all([
      supabase
        .from("feedback_version_links")
        .select("id, token, enabled")
        .eq("catalog_song_version_id", versionId)
        .maybeSingle(),
      fetch(`/api/feedback/version/${versionId}/signed-audio`),
    ]);

    const link = linkRes.data;
    let audioUrl: string | null = null;
    let expiresInSec = 3600;
    if (audioRes.ok) {
      const j = (await audioRes.json()) as {
        signedUrl?: string;
        expiresInSec?: number;
      };
      audioUrl = typeof j.signedUrl === "string" ? j.signedUrl : null;
      if (typeof j.expiresInSec === "number") expiresInSec = j.expiresInSec;
    }
    setAudioUrl(audioUrl);

    let commentsTree: PublicFeedbackRootJson[] = [];
    if (link) {
      const typedLink = link as {
        id: string;
        token: string;
        enabled: boolean;
      };
      setLinkRow(typedLink);
      const { data: raw } = await supabase
        .from("feedback_comments")
        .select(
          "id, body, seconds_into_track, display_name, parent_id, created_at"
        )
        .eq("feedback_link_id", typedLink.id)
        .order("created_at", { ascending: true });

      commentsTree = buildCommentTree((raw as FeedbackCommentRow[]) ?? []);
      setComments(commentsTree);
    } else {
      setLinkRow(null);
      setComments([]);
    }

    if (audioUrl) {
      writeFeedbackArtistDetailCache(versionId, {
        version: row,
        linkRow: link
          ? (link as { id: string; token: string; enabled: boolean })
          : null,
        comments: commentsTree,
        audioUrl,
        expiresInSec,
      });
    } else {
      invalidateFeedbackArtistDetailCache(versionId);
    }

    if (!opts?.silent) setLoading(false);
  }, [versionId, onLoadedMeta]);

  useEffect(() => {
    const cached = readFeedbackArtistDetailCache(versionId);
    if (cached) {
      setVersion(cached.version);
      setLinkRow(cached.linkRow);
      setComments(cached.comments);
      setAudioUrl(cached.audioUrl);
      setLoading(false);
    } else {
      setLoading(true);
      setVersion(null);
      setLinkRow(null);
      setComments([]);
      setAudioUrl(null);
    }
    void load({ silent: !!cached });
  }, [versionId, load]);

  useEffect(() => {
    setAudioError(null);
  }, [audioUrl]);

  useLayoutEffect(() => {
    if (embedStudio) return;
    const a = audioRef.current;
    if (!a || !audioUrl) return;
    a.src = audioUrl;
    a.load();
  }, [audioUrl, embedStudio]);

  useEffect(() => {
    if (embedStudio) return;
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => setCurrent(a.currentTime);
    const onDur = () => {
      const d = a.duration;
      setDuration(Number.isFinite(d) ? d : 0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [audioUrl, embedStudio]);

  const songTitle = version?.catalog_songs?.title ?? "Untitled";

  const embeddedBarTrack = useMemo(
    () =>
      embedStudio && audioUrl && !audioError
        ? { src: audioUrl, songTitle, versionLabel }
        : null,
    [embedStudio, audioUrl, audioError, songTitle, versionLabel]
  );

  const embeddedBarError: string | null = embedStudio
    ? audioError || (!audioUrl ? "Could not load audio." : null)
    : null;

  const seek = (value: number) => {
    if (embedStudio) {
      embeddedPlayerRef.current?.seek(value);
      return;
    }
    const a = audioRef.current;
    if (!a || !Number.isFinite(duration) || duration <= 0) return;
    a.currentTime = value;
    setCurrent(value);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else void a.play().catch(() => setPlaying(false));
  };

  const deleteComment = async (id: string) => {
    setDeletingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("feedback_comments").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await load({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  if (version === null) {
    return (
      <div>
        <p className="text-neutral-400">Version not found.</p>
        <button
          type="button"
          onClick={() => {
            if (embedStudio) {
              onMissingVersion?.();
              if (!onMissingVersion) router.push("/home");
            } else {
              router.push("/feedback");
            }
          }}
          className="mt-4 text-sm text-white underline"
        >
          {embedStudio ? "Back to list" : "Back to Feedback"}
        </button>
      </div>
    );
  }

  const mainColumn = (
    <>
      {!embedStudio && (
        <Link
          href="/feedback"
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Feedback
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{songTitle}</h1>
          <p className="mt-1 text-sm text-neutral-500">{versionLabel}</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setShareOpen(true)}>
          Share link
        </Button>
      </div>

      {!linkRow && (
        <p className="mt-4 max-w-xl text-sm text-neutral-500">
          No share link yet. Open Share link to create one and copy the URL for
          listeners.
        </p>
      )}

      {linkRow && (
        <p className="mt-2 text-xs text-neutral-600">
          Public link is{" "}
          <span className={linkRow.enabled ? "text-green-400/90" : "text-neutral-500"}>
            {linkRow.enabled ? "enabled" : "disabled"}
          </span>
          .
        </p>
      )}

      {!embedStudio && (
        <>
          <audio
            ref={audioRef}
            preload="auto"
            className="hidden"
            onError={() =>
              setAudioError(
                "Audio could not be played. The file may be missing from storage, or try refreshing the page."
              )
            }
          />

          <div className="mt-8 flex flex-col gap-0">
            {!audioUrl && (
              <p className="text-sm text-red-300">Could not load audio.</p>
            )}
            {audioError && audioUrl && (
              <p className="text-sm text-red-300">{audioError}</p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!audioUrl}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-neutral-200 disabled:opacity-40"
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <Pause
                    className="h-6 w-6"
                    fill="currentColor"
                    stroke="none"
                    strokeWidth={0}
                  />
                ) : (
                  <Play
                    className="h-6 w-6 pl-0.5"
                    fill="currentColor"
                    stroke="none"
                    strokeWidth={0}
                  />
                )}
              </button>
              <div
                className={cn(
                  "relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-800",
                  (!Number.isFinite(duration) || duration <= 0) && "opacity-50"
                )}
              >
                <div
                  className="pointer-events-none absolute left-0 top-0 h-full bg-white"
                  style={{
                    width:
                      duration > 0
                        ? `${Math.min(100, Math.max(0, (current / duration) * 100))}%`
                        : "0%",
                  }}
                />
                <input
                  id={`${idPrefix}-seek`}
                  type="range"
                  min={0}
                  max={Math.max(duration, 0.01)}
                  step={0.05}
                  value={duration > 0 ? Math.min(current, duration) : 0}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  disabled={!Number.isFinite(duration) || duration <= 0 || !audioUrl}
                  aria-label="Seek"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 shrink-0" aria-hidden />
              <div className="flex min-w-0 flex-1 justify-between text-xs tabular-nums text-neutral-500">
                <span className="text-left">{formatAudioTime(current)}</span>
                <span className="text-right">{formatAudioTime(duration)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      <section
        className={cn(
          "border-t border-neutral-800 pt-8",
          embedStudio ? "mt-6" : "mt-10"
        )}
      >
        <h2 className="text-sm font-medium text-white">Comments</h2>
        {comments.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No comments yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {comments.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-neutral-800 bg-neutral-950/80 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-pink-400 hover:underline"
                    onClick={() => seek(c.secondsIntoTrack)}
                  >
                    {formatAudioTime(c.secondsIntoTrack)}
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === c.id}
                    onClick={() => void deleteComment(c.id)}
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-red-300"
                    aria-label="Delete comment thread"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {c.displayName ?? "Anonymous"}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-200">
                  {c.body}
                </p>
                {c.replies.length > 0 && (
                  <ul className="mt-3 space-y-2 border-l border-neutral-800 pl-3">
                    {c.replies.map((r) => (
                      <li key={r.id} className="flex justify-between gap-2">
                        <div>
                          <p className="text-xs text-neutral-500">
                            {r.displayName ?? "Anonymous"}
                          </p>
                          <p className="text-sm text-neutral-300">{r.body}</p>
                        </div>
                        <button
                          type="button"
                          disabled={deletingId === r.id}
                          onClick={() => void deleteComment(r.id)}
                          className="shrink-0 rounded p-1 text-neutral-500 hover:text-red-300"
                          aria-label="Delete reply"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <FeedbackShareModal
        open={shareOpen}
        onClose={() => {
          setShareOpen(false);
          void load({ silent: true });
        }}
        catalogSongVersionId={versionId}
        songTitle={songTitle}
        versionLabel={versionLabel}
      />
    </>
  );

  if (embedStudio) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{mainColumn}</div>
        <MicroappAudioPlayerBar
          ref={embeddedPlayerRef}
          variant="embedded"
          track={embeddedBarTrack}
          loading={false}
          error={embeddedBarError}
          onClear={() => {}}
          showDismiss={false}
          autoPlayOnNewSource={false}
          ariaLabel="Feedback audio player"
          onPlaybackError={() =>
            setAudioError(
              "Audio could not be played. The file may be missing from storage, or try refreshing the page."
            )
          }
        />
      </div>
    );
  }

  return <div>{mainColumn}</div>;
}
