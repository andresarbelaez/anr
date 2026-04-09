"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { MicroappAudioPlayerBarHandle } from "@/components/audio/MicroappAudioPlayerBar";
import { MicroappAudioPlayerBar } from "@/components/audio/MicroappAudioPlayerBar";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { formatFeedbackRelativeTime } from "@/lib/utils/format-feedback-relative-time";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { StudioMicroappPrimaryButton } from "@/components/studio/ui/StudioMicroappPrimaryButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { studioMicroappAudioBarSharedEmbedProps } from "@/components/audio/microapp-audio-player-theme";
import { FeedbackShareModal } from "@/components/feedback/FeedbackShareModal";
import { FeedbackDeleteCommentConfirmModal } from "@/components/feedback/FeedbackDeleteCommentConfirmModal";
import { S } from "@/components/studio/ui/s";

function feedbackAvatarInitial(displayName: string | null): string {
  const s = (displayName ?? "Anonymous").trim();
  const ch = s[0];
  return ch ? ch.toUpperCase() : "?";
}

type VersionRow = {
  id: string;
  label: string | null;
  file_name: string;
  storage_path: string;
  catalog_songs: { id: string; title: string } | null;
};

/**
 * Feedback version detail for the studio Feedback micro-app only.
 * Legacy `/feedback/*` dashboard routes redirect to `/home?open=feedback`; playback uses `MicroappAudioPlayerBar` only.
 */
export function FeedbackArtistDetailClient({
  versionId,
  onMissingVersion,
  onLoadedMeta,
}: {
  versionId: string;
  onMissingVersion?: () => void;
  /** Fired when version row is resolved (for studio title bar, etc.). */
  onLoadedMeta?: (meta: { songTitle: string; versionLabel: string }) => void;
}) {
  const router = useRouter();
  const idPrefix = useId();
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
  const [shareOpen, setShareOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    deletesThread: boolean;
  } | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [newBody, setNewBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDisplayName, setReplyDisplayName] = useState("");
  const [replyBody, setReplyBody] = useState("");

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

  useEffect(() => {
    setPlayheadSec(0);
  }, [audioUrl]);

  const songTitle = version?.catalog_songs?.title ?? "Untitled";

  const embeddedBarTrack = useMemo(
    () =>
      audioUrl && !audioError
        ? { src: audioUrl, songTitle, versionLabel }
        : null,
    [audioUrl, audioError, songTitle, versionLabel]
  );

  const embeddedBarError: string | null =
    audioError || (!audioUrl ? "Could not load audio." : null);

  const seek = useCallback((value: number) => {
    embeddedPlayerRef.current?.seek(value);
  }, []);

  const deleteComment = async (id: string): Promise<boolean> => {
    setDeletingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("feedback_comments")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
      await load({ silent: true });
      return true;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not delete.");
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  const postTopComment = async () => {
    if (!linkRow || !newBody.trim() || !displayName.trim()) return;
    setPosting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("feedback_comments").insert({
        feedback_link_id: linkRow.id,
        parent_id: null,
        body: newBody.trim(),
        seconds_into_track: playheadSec,
        display_name: displayName.trim(),
        giver_secret: crypto.randomUUID(),
      });
      if (error) throw new Error(error.message);
      setNewBody("");
      await load({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not post comment.");
    } finally {
      setPosting(false);
    }
  };

  const postArtistReply = async (parentId: string) => {
    if (!linkRow || !replyBody.trim() || !replyDisplayName.trim()) return;
    setPosting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("feedback_comments").insert({
        feedback_link_id: linkRow.id,
        parent_id: parentId,
        body: replyBody.trim(),
        seconds_into_track: null,
        display_name: replyDisplayName.trim(),
        giver_secret: crypto.randomUUID(),
      });
      if (error) throw new Error(error.message);
      setReplyBody("");
      setReplyDisplayName("");
      setReplyTo(null);
      await load({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not post reply.");
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 justify-center py-24 studio-fb-detail">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  if (version === null) {
    return (
      <div className="studio-fb-detail px-4 py-4">
        <p className="text-neutral-400">Version not found.</p>
        <button
          type="button"
          onClick={() => {
            onMissingVersion?.();
            if (!onMissingVersion) router.push("/home");
          }}
          className="mt-4 text-sm text-white underline"
        >
          Back to list
        </button>
      </div>
    );
  }

  const feedbackCommentTotal = comments.reduce(
    (n, c) => n + 1 + c.replies.length,
    0
  );

  const mainColumn = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            background: S.surface,
            borderBottom: `1px solid ${S.border}`,
            flexShrink: 0,
            width: "100%",
          }}
        >
          <span
            className="min-w-0 flex-1"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: S.textSecondary,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={`Feedback for ${songTitle} · ${versionLabel}`}
          >
            Feedback for {songTitle} · {versionLabel}
          </span>
          <StudioMicroappPrimaryButton
            label="Share link"
            onClick={() => setShareOpen(true)}
            className="shrink-0"
          />
        </div>
        {!linkRow && (
          <div
            className="px-4 py-2.5"
            style={{
              background: S.bg,
              borderBottom: `1px solid ${S.borderFaint}`,
            }}
          >
            <p
              className="m-0 max-w-xl"
              style={{ fontSize: 12, color: S.textMuted, lineHeight: 1.5 }}
            >
              No share link yet. Open Share link to create one and copy the URL
              for listeners.
            </p>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-neutral-800 px-4 pb-4 pt-6">
      <section
        className={cn(
          linkRow
            ? "grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_1fr_auto] overflow-hidden"
            : "shrink-0"
        )}
      >
        <h2 className="text-sm font-medium text-white">
          Comments ({feedbackCommentTotal})
        </h2>
        {!linkRow ? (
          <p className="mt-3 max-w-xl text-sm text-neutral-500">
            Create a share link above to add comments here and for listeners.
          </p>
        ) : (
          <>
            <div className="min-h-0 overflow-y-auto overscroll-contain pt-3">
              {comments.length === 0 ? (
                <p className="text-sm text-neutral-500">No comments yet.</p>
              ) : (
                <ul className="space-y-4 pb-4 pr-1">
                {comments.map((c) => {
                  const relAgo = formatFeedbackRelativeTime(c.createdAt);
                  return (
                    <li key={c.id} className="flex gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-sm font-semibold text-pink-400"
                        aria-hidden
                      >
                        {feedbackAvatarInitial(c.displayName)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="relative rounded-lg border border-neutral-800 bg-neutral-950/80 p-4">
                          <div className="absolute right-2 top-2">
                            <button
                              type="button"
                              disabled={deletingId !== null}
                              onClick={() =>
                                setDeleteTarget({
                                  id: c.id,
                                  deletesThread: true,
                                })
                              }
                              className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-red-300"
                              aria-label="Delete comment thread"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="pr-10 text-xs text-neutral-500">
                            <span
                              className="font-semibold"
                              style={{ color: S.textPrimary }}
                            >
                              {c.displayName ?? "Anonymous"}
                            </span>{" "}
                            <button
                              type="button"
                              className="font-medium hover:underline"
                              style={{ color: S.link }}
                              onClick={() => seek(c.secondsIntoTrack)}
                            >
                              at {formatAudioTime(c.secondsIntoTrack)}
                            </button>
                            {relAgo ? (
                              <>
                                <span aria-hidden="true">{" \u2022 "}</span>
                                <span>{relAgo}</span>
                              </>
                            ) : null}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-200">
                            {c.body}
                          </p>
                        </div>
                        {c.replies.length > 0 && (
                          <ul className="space-y-3 border-l border-neutral-800 pl-3">
                            {c.replies.map((r) => {
                              const relReply = formatFeedbackRelativeTime(
                                r.createdAt
                              );
                              return (
                                <li key={r.id} className="flex gap-2">
                                  <div
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-semibold text-pink-400"
                                    aria-hidden
                                  >
                                    {feedbackAvatarInitial(r.displayName)}
                                  </div>
                                  <div className="relative min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-950/80 p-3">
                                    <div className="absolute right-1.5 top-1.5">
                                      <button
                                        type="button"
                                        disabled={deletingId !== null}
                                        onClick={() =>
                                          setDeleteTarget({
                                            id: r.id,
                                            deletesThread: false,
                                          })
                                        }
                                        className="rounded p-1 text-neutral-500 hover:text-red-300"
                                        aria-label="Delete reply"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                    <p className="pr-9 text-xs text-neutral-500">
                                      <span
                                        className="font-semibold"
                                        style={{ color: S.textPrimary }}
                                      >
                                        {r.displayName ?? "Anonymous"}
                                      </span>
                                      {relReply ? (
                                        <>
                                          <span aria-hidden="true">
                                            {" \u2022 "}
                                          </span>
                                          <span>{relReply}</span>
                                        </>
                                      ) : null}
                                    </p>
                                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-neutral-300">
                                      {r.body}
                                    </p>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <div>
                          {replyTo === c.id ? (
                            <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-950/80 p-3">
                              <Input
                                id={`${idPrefix}-reply-name-${c.id}`}
                                label="Name"
                                appearance="studio"
                                value={replyDisplayName}
                                onChange={(e) =>
                                  setReplyDisplayName(e.target.value)
                                }
                                placeholder="Your name"
                                required
                                autoComplete="name"
                              />
                              <Textarea
                                id={`${idPrefix}-reply-${c.id}`}
                                label="Reply"
                                appearance="studio"
                                value={replyBody}
                                onChange={(e) => setReplyBody(e.target.value)}
                                rows={2}
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="studioMicroappPrimary"
                                  loading={posting}
                                  onClick={() => void postArtistReply(c.id)}
                                  disabled={
                                    !replyBody.trim() ||
                                    !replyDisplayName.trim()
                                  }
                                >
                                  Send reply
                                </Button>
                                <Button
                                  type="button"
                                  variant="outlineSoft"
                                  size="sm"
                                  className="!rounded-sm !border-[#d4b896] !text-xs font-medium text-[#5a3518]"
                                  onClick={() => {
                                    setReplyTo(null);
                                    setReplyDisplayName("");
                                    setReplyBody("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outlineSoft"
                              size="sm"
                              className="!rounded-sm !border-[#d4b896] !text-xs font-medium text-[#5a3518]"
                              disabled={deletingId !== null || posting}
                              onClick={() => {
                                setReplyDisplayName(displayName);
                                setReplyBody("");
                                setReplyTo(c.id);
                              }}
                            >
                              Reply
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              )}
            </div>

            <div className="space-y-2 border-t border-neutral-800 pt-6">
              <h3
                className="text-sm font-medium text-white"
                style={{ letterSpacing: "0.02em" }}
              >
                Add a comment
              </h3>
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2">
                <label
                  htmlFor={`${idPrefix}-artist-name`}
                  className="col-start-1 row-start-1 shrink-0 self-center text-right text-sm font-medium text-[#5a3518]"
                >
                  Your name
                </label>
                <div className="col-start-2 row-start-1 min-w-0 self-center">
                  <Input
                    id={`${idPrefix}-artist-name`}
                    appearance="studio"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Your artist name"
                    required
                    autoComplete="name"
                  />
                </div>
                <label
                  htmlFor={`${idPrefix}-artist-note`}
                  className="col-start-1 row-start-2 shrink-0 self-start pt-2 text-sm font-medium leading-snug text-[#5a3518]"
                >
                  Comment at {formatAudioTime(playheadSec)}
                </label>
                <div className="col-start-2 row-start-2 min-w-0">
                  <Textarea
                    id={`${idPrefix}-artist-note`}
                    appearance="studio"
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="What are you hearing?"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="studioMicroappPrimary"
                  loading={posting}
                  onClick={() => void postTopComment()}
                  disabled={!newBody.trim() || !displayName.trim()}
                >
                  Add comment
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="studio-fb-detail flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          {mainColumn}
        </div>
        <MicroappAudioPlayerBar
          ref={embeddedPlayerRef}
          {...studioMicroappAudioBarSharedEmbedProps}
          variant="feedback"
          track={embeddedBarTrack}
          loading={false}
          error={embeddedBarError}
          onClear={() => {}}
          ariaLabel="Feedback audio player"
          onPlaybackError={() =>
            setAudioError(
              "Audio could not be played. The file may be missing from storage, or try refreshing the page."
            )
          }
          onTimeUpdate={setPlayheadSec}
        />
      </div>
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

      <FeedbackDeleteCommentConfirmModal
        open={deleteTarget !== null}
        onClose={() => deletingId === null && setDeleteTarget(null)}
        busy={deletingId !== null}
        deletesThread={deleteTarget?.deletesThread ?? false}
        appearance="dark"
        onConfirm={async () => {
          const target = deleteTarget;
          if (!target) return;
          const ok = await deleteComment(target.id);
          if (ok) setDeleteTarget(null);
        }}
      />
    </>
  );
}
