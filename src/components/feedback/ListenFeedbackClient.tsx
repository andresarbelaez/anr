"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { MicroappAudioPlayerBarHandle } from "@/components/audio/MicroappAudioPlayerBar";
import { MicroappAudioPlayerBar } from "@/components/audio/MicroappAudioPlayerBar";
import { FEEDBACK_TOKEN_RE } from "@/lib/feedback/feedback-token";
import {
  readListenSessionCache,
  writeListenSessionCache,
} from "@/lib/feedback/listen-session-cache";
import type {
  PublicFeedbackBootstrapJson,
  PublicFeedbackCommentsJson,
  PublicFeedbackRootJson,
  PublicFeedbackSessionJson,
} from "@/lib/feedback/types";
import { formatAudioTime } from "@/lib/utils/format-audio-time";
import { formatFeedbackRelativeTime } from "@/lib/utils/format-feedback-relative-time";
import { Button } from "@/components/ui/button";
import { S } from "@/components/studio/ui/s";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { FeedbackDeleteCommentConfirmModal } from "@/components/feedback/FeedbackDeleteCommentConfirmModal";
import { cn } from "@/lib/utils/cn";

function giverStorageKey(token: string) {
  return `sidestage-fb-giver-${token}`;
}

function getOrCreateGiverSecret(token: string): string {
  const k = giverStorageKey(token);
  let s = localStorage.getItem(k);
  if (!s || !FEEDBACK_TOKEN_RE.test(s)) {
    s = crypto.randomUUID();
    localStorage.setItem(k, s);
  }
  return s;
}

function postedKey(token: string) {
  return `sidestage-fb-posted-${token}`;
}

function feedbackAvatarInitial(displayName: string | null): string {
  const s = (displayName ?? "Anonymous").trim();
  const ch = s[0];
  return ch ? ch.toUpperCase() : "?";
}

function rememberPostedId(token: string, id: string) {
  try {
    const raw = sessionStorage.getItem(postedKey(token));
    const arr: string[] = raw ? JSON.parse(raw) : [];
    if (!arr.includes(id)) {
      arr.push(id);
      sessionStorage.setItem(postedKey(token), JSON.stringify(arr));
    }
  } catch {
    /* ignore */
  }
}

function isPostedByThisBrowser(token: string, id: string): boolean {
  try {
    const raw = sessionStorage.getItem(postedKey(token));
    if (!raw) return false;
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) && arr.includes(id);
  } catch {
    return false;
  }
}

let supabasePreconnectDone = false;

export function ListenFeedbackClient({ token }: { token: string }) {
  const idPrefix = useId();
  const listenPlayerRef = useRef<MicroappAudioPlayerBarHandle>(null);
  const [session, setSession] = useState<PublicFeedbackSessionJson | null>(
    null
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [audioPlaybackError, setAudioPlaybackError] = useState<string | null>(
    null
  );
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [playheadSec, setPlayheadSec] = useState(0);

  const [displayName, setDisplayName] = useState("");
  const [newBody, setNewBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDisplayName, setReplyDisplayName] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    deletesThread: boolean;
  } | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      !supabasePreconnectDone &&
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ) {
      supabasePreconnectDone = true;
      const l = document.createElement("link");
      l.rel = "preconnect";
      l.href = process.env.NEXT_PUBLIC_SUPABASE_URL;
      l.crossOrigin = "anonymous";
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cached = readListenSessionCache(token);
    const hadCache = !!cached;

    if (cached) {
      setSession(cached);
      setLoadError(null);
      setLoading(false);
      setCommentsLoading(false);
      setCommentsError(null);
    } else {
      setLoading(true);
      setCommentsLoading(true);
      setLoadError(null);
      setCommentsError(null);
    }

    const base = `/api/public/feedback/${token}`;
    const bootP = fetch(`${base}/bootstrap`).then(async (res) => ({
      ok: res.ok,
      json: (await res.json()) as Record<string, unknown>,
    }));
    const commP = fetch(`${base}/comments`).then(async (res) => ({
      ok: res.ok,
      json: (await res.json()) as Record<string, unknown>,
    }));

    void bootP.then(({ ok, json }) => {
      if (cancelled) return;
      if (!ok) {
        if (!readListenSessionCache(token)) {
          setLoadError(String(json.error ?? "Could not load."));
        }
        setLoading(false);
        return;
      }
      const b = json as unknown as PublicFeedbackBootstrapJson;
      setSession((prev) => ({
        songTitle: b.songTitle,
        versionLabel: b.versionLabel,
        artistName:
          typeof b.artistName === "string" && b.artistName.trim()
            ? b.artistName
            : "this artist",
        audioUrl: b.audioUrl,
        audioUrlExpiresInSec: b.audioUrlExpiresInSec,
        comments: prev?.comments ?? [],
      }));
      setLoading(false);
      setLoadError(null);
    });

    void commP.then(({ ok, json }) => {
      if (cancelled) return;
      if (!hadCache) setCommentsLoading(false);
      if (!ok) {
        if (!hadCache) {
          setCommentsError(
            String(json.error ?? "Could not load comments.")
          );
        }
        return;
      }
      const c = json as unknown as PublicFeedbackCommentsJson;
      setSession((prev) =>
        prev ? { ...prev, comments: c.comments } : null
      );
      setCommentsError(null);
    });

    void Promise.all([bootP, commP]).then(([br, cr]) => {
      if (cancelled || !br.ok || !cr.ok) return;
      const b = br.json as unknown as PublicFeedbackBootstrapJson;
      const c = cr.json as unknown as PublicFeedbackCommentsJson;
      writeListenSessionCache(token, { ...b, comments: c.comments });
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    setAudioPlaybackError(null);
    setPlayheadSec(0);
  }, [token, session?.audioUrl]);

  const listenTrack = useMemo(
    () =>
      session?.audioUrl
        ? {
            src: session.audioUrl,
            songTitle: session.songTitle,
            versionLabel: session.versionLabel,
          }
        : null,
    [session?.audioUrl, session?.songTitle, session?.versionLabel]
  );

  const seek = (value: number) => {
    listenPlayerRef.current?.seek(value);
  };

  const mergeRoot = (
    prev: PublicFeedbackRootJson[],
    next: PublicFeedbackRootJson
  ) => {
    const i = prev.findIndex((c) => c.id === next.id);
    if (i >= 0) {
      const copy = [...prev];
      copy[i] = next;
      return copy;
    }
    return [...prev, next].sort(
      (a, b) => a.secondsIntoTrack - b.secondsIntoTrack
    );
  };

  const postTopLevel = async () => {
    if (!session || !newBody.trim() || !displayName.trim()) return;
    setPosting(true);
    try {
      const giverSecret = getOrCreateGiverSecret(token);
      const res = await fetch(`/api/public/feedback/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: newBody.trim(),
          displayName: displayName.trim(),
          secondsIntoTrack: playheadSec,
          parentId: null,
          giverSecret,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "Could not post."
        );
      }
      const comment = json.comment as PublicFeedbackRootJson;
      rememberPostedId(token, comment.id);
      setSession((s) => {
        if (!s) return s;
        const next = { ...s, comments: mergeRoot(s.comments, comment) };
        writeListenSessionCache(token, next);
        return next;
      });
      setNewBody("");
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not post.");
    } finally {
      setPosting(false);
    }
  };

  const postReply = async (parentId: string) => {
    if (!session || !replyBody.trim() || !replyDisplayName.trim()) return;
    setPosting(true);
    try {
      const giverSecret = getOrCreateGiverSecret(token);
      const res = await fetch(`/api/public/feedback/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: replyBody.trim(),
          displayName: replyDisplayName.trim(),
          parentId,
          giverSecret,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "Could not post."
        );
      }
      const reply = json.reply as {
        id: string;
        body: string;
        displayName: string | null;
        createdAt: string;
      };
      rememberPostedId(token, reply.id);
      setSession((s) => {
        if (!s) return s;
        const comments = s.comments.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...c.replies, reply] }
            : c
        );
        const next = { ...s, comments };
        writeListenSessionCache(token, next);
        return next;
      });
      setReplyBody("");
      setReplyDisplayName("");
      setReplyTo(null);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not post.");
    } finally {
      setPosting(false);
    }
  };

  const refreshCommentsFromServer = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/public/feedback/${token}/comments`);
      const json = (await res.json()) as PublicFeedbackCommentsJson & {
        error?: string;
      };
      if (!res.ok) return false;
      if (!Array.isArray(json.comments)) return false;
      setSession((s) => {
        if (!s) return s;
        const next = { ...s, comments: json.comments };
        writeListenSessionCache(token, next);
        return next;
      });
      setCommentsError(null);
      return true;
    } catch {
      return false;
    }
  }, [token]);

  const deleteOwn = async (commentId: string): Promise<boolean> => {
    setDeletingCommentId(commentId);
    try {
      const giverSecret = getOrCreateGiverSecret(token);
      const res = await fetch(
        `/api/public/feedback/${token}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ giverSecret }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setLoadError(
          typeof json?.error === "string" ? json.error : "Could not delete."
        );
        return false;
      }
      const refreshed = await refreshCommentsFromServer();
      if (!refreshed) {
        setSession((s) => {
          if (!s) return s;
          const comments = s.comments
            .filter((c) => c.id !== commentId)
            .map((c) => ({
              ...c,
              replies: c.replies.filter((r) => r.id !== commentId),
            }));
          const next = { ...s, comments };
          writeListenSessionCache(token, next);
          return next;
        });
      }
      setLoadError(null);
      return true;
    } catch {
      setLoadError("Could not delete.");
      return false;
    } finally {
      setDeletingCommentId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-16">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[#ecddc8] border-t-[#a85c10]"
          aria-hidden
        />
      </div>
    );
  }

  if (loadError && !session) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            background: S.errorBg,
            borderColor: S.error,
            color: S.error,
          }}
        >
          {loadError}
        </p>
      </div>
    );
  }

  if (!session) return null;

  const listenCommentTotal = session.comments.reduce(
    (n, c) => n + 1 + c.replies.length,
    0
  );

  const commentListScrollable = session.comments.length > 0;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col gap-6 overflow-hidden pb-2">
      <h1 className="sr-only">
        {session.songTitle} · {session.versionLabel} · {session.artistName}
      </h1>

      <div className="shrink-0">
        <MicroappAudioPlayerBar
          ref={listenPlayerRef}
          appearance="listen"
          variant="feedback"
          track={listenTrack}
          loading={false}
          error={audioPlaybackError}
          onClear={() => {}}
          autoPlayOnNewSource={false}
          ariaLabel="Track audio player"
          onTimeUpdate={setPlayheadSec}
          onPlaybackError={() =>
            setAudioPlaybackError(
              "Audio could not be loaded. The link may have expired — refresh the page. If it persists, the file may be missing from storage."
            )
          }
        />
      </div>

      {loadError && (
        <p className="shrink-0 text-sm" style={{ color: S.error }}>
          {loadError}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <section
          className={cn(
            "flex flex-col gap-3",
            commentListScrollable && "min-h-0 flex-1 overflow-hidden"
          )}
        >
          <h2
            className="shrink-0 text-sm font-semibold tracking-wide uppercase"
            style={{ color: S.textSecondary, letterSpacing: "0.04em" }}
          >
            Comments ({listenCommentTotal})
          </h2>
          {commentsError ? (
            <p className="shrink-0 text-sm" style={{ color: S.warning }}>
              {commentsError}
            </p>
          ) : commentsLoading && session.comments.length === 0 ? (
            <p className="shrink-0 text-sm" style={{ color: S.textMuted }}>
              Loading comments…
            </p>
          ) : session.comments.length === 0 ? (
            <p className="shrink-0 text-sm" style={{ color: S.textMuted }}>
              No comments yet.
            </p>
          ) : (
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
              role="region"
              aria-label="Comments list"
            >
              <ul className="space-y-4 pb-4">
            {session.comments.map((c) => {
              const relAgo = formatFeedbackRelativeTime(c.createdAt);
              const showDeleteRoot = isPostedByThisBrowser(token, c.id);
              return (
                <li key={c.id} className="flex gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                    style={{ background: S.accentBg, color: S.accent }}
                    aria-hidden
                  >
                    {feedbackAvatarInitial(c.displayName)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div
                      className="relative rounded-lg border p-4"
                      style={{
                        background: S.surface,
                        borderColor: S.border,
                      }}
                    >
                      {showDeleteRoot && (
                        <div className="absolute right-2 top-2">
                          <Button
                            type="button"
                            variant="bare"
                            disabled={deletingCommentId !== null}
                            onClick={() =>
                              setPendingDelete({
                                id: c.id,
                                deletesThread: true,
                              })
                            }
                            className="rounded p-1 text-[#8a6040] hover:bg-black/[0.04] hover:text-[#a82820]"
                            aria-label="Delete my comment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <p
                        className={`text-xs ${showDeleteRoot ? "pr-10" : ""}`}
                        style={{ color: S.textMuted }}
                      >
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
                      <p
                        className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed"
                        style={{ color: S.textPrimary }}
                      >
                        {c.body}
                      </p>
                    </div>

                    {c.replies.length > 0 && (
                      <ul
                        className="space-y-3 border-l pl-3"
                        style={{ borderColor: S.borderFaint }}
                      >
                        {c.replies.map((r) => {
                          const relReply = formatFeedbackRelativeTime(
                            r.createdAt
                          );
                          const showDeleteReply = isPostedByThisBrowser(
                            token,
                            r.id
                          );
                          return (
                            <li key={r.id} className="flex gap-2">
                              <div
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                                style={{
                                  background: S.accentBg,
                                  color: S.accent,
                                }}
                                aria-hidden
                              >
                                {feedbackAvatarInitial(r.displayName)}
                              </div>
                              <div
                                className="relative min-w-0 flex-1 rounded-lg border p-3"
                                style={{
                                  background: S.surfaceAlt,
                                  borderColor: S.borderFaint,
                                }}
                              >
                                {showDeleteReply && (
                                  <div className="absolute right-1.5 top-1.5">
                                    <Button
                                      type="button"
                                      variant="bare"
                                      disabled={deletingCommentId !== null}
                                      onClick={() =>
                                        setPendingDelete({
                                          id: r.id,
                                          deletesThread: false,
                                        })
                                      }
                                      className="rounded p-1 text-[#8a6040] hover:bg-black/[0.04] hover:text-[#a82820]"
                                      aria-label="Delete my reply"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                                <p
                                  className={`text-xs ${showDeleteReply ? "pr-9" : ""}`}
                                  style={{ color: S.textMuted }}
                                >
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
                                <p
                                  className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed"
                                  style={{ color: S.textSecondary }}
                                >
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
                        <div className="space-y-2">
                          <Input
                            id={`${idPrefix}-reply-name-${c.id}`}
                            label="Name"
                            appearance="studio"
                            value={replyDisplayName}
                            onChange={(e) => setReplyDisplayName(e.target.value)}
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
                              variant="studioAccent"
                              size="sm"
                              loading={posting}
                              className="!rounded-sm"
                              onClick={() => void postReply(c.id)}
                              disabled={
                                !replyBody.trim() || !replyDisplayName.trim()
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
            </div>
          )}
        </section>

        <section className="shrink-0 space-y-4">
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ color: S.textSecondary, letterSpacing: "0.04em" }}
        >
          Leave feedback for {session.artistName}
        </h2>
        <Input
          id={`${idPrefix}-name`}
          label="Your name"
          appearance="studio"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Mom"
          required
          autoComplete="name"
        />
        <Textarea
          id={`${idPrefix}-note`}
          label={`Comment at ${formatAudioTime(playheadSec)}`}
          appearance="studio"
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder="What are you hearing that could be improved?"
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="studioMicroappPrimary"
            loading={posting}
            onClick={() => void postTopLevel()}
            disabled={!newBody.trim() || !displayName.trim()}
          >
            Add comment
          </Button>
        </div>
        </section>
      </div>

      <p
        className="shrink-0 text-center text-[11px] leading-relaxed"
        style={{ color: S.textFaint }}
      >
        Powered by{" "}
        <a
          href="https://sidestage.fm"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline decoration-[#c4a88c] underline-offset-2 transition hover:decoration-[#a85c10]"
          style={{ color: S.accent }}
        >
          sidestage.fm
        </a>{" "}
        — free tools for musical artists.
      </p>

      <FeedbackDeleteCommentConfirmModal
        open={pendingDelete !== null}
        onClose={() =>
          deletingCommentId === null && setPendingDelete(null)
        }
        busy={deletingCommentId !== null}
        deletesThread={pendingDelete?.deletesThread ?? false}
        appearance="studio"
        onConfirm={async () => {
          const target = pendingDelete;
          if (!target) return;
          const ok = await deleteOwn(target.id);
          if (ok) setPendingDelete(null);
        }}
      />
    </div>
  );
}
