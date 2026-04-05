"use client";

import { useEffect, useId, useRef, useState } from "react";
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
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pause, Play, Trash2 } from "lucide-react";

function giverStorageKey(token: string) {
  return `anr-fb-giver-${token}`;
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
  return `anr-fb-posted-${token}`;
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const [session, setSession] = useState<PublicFeedbackSessionJson | null>(
    null
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [newBody, setNewBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

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
    const a = audioRef.current;
    const url = session?.audioUrl;
    if (!a || !url) return;
    a.src = url;
    a.load();
  }, [session?.audioUrl]);

  useEffect(() => {
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
  }, [session?.audioUrl]);

  const seek = (value: number) => {
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
    if (!session || !newBody.trim()) return;
    setPosting(true);
    try {
      const giverSecret = getOrCreateGiverSecret(token);
      const res = await fetch(`/api/public/feedback/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: newBody.trim(),
          displayName: displayName.trim() || null,
          secondsIntoTrack: current,
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
    if (!session || !replyBody.trim()) return;
    setPosting(true);
    try {
      const giverSecret = getOrCreateGiverSecret(token);
      const res = await fetch(`/api/public/feedback/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: replyBody.trim(),
          displayName: displayName.trim() || null,
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
      setReplyTo(null);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not post.");
    } finally {
      setPosting(false);
    }
  };

  const deleteOwn = async (commentId: string) => {
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
      throw new Error(
        typeof json?.error === "string" ? json.error : "Could not delete."
      );
    }
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
    setLoadError(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  if (loadError && !session) {
    return (
      <p className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-200">
        {loadError}
      </p>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">
          {session.songTitle}
        </h1>
        <p className="text-sm text-neutral-500">{session.versionLabel}</p>
      </div>

      <audio
        ref={audioRef}
        preload="auto"
        className="hidden"
        onError={() => {
          setLoadError(
            "Audio could not be loaded. The link may have expired — refresh the page. If it persists, the file may be missing from storage."
          );
        }}
      />

      <div className="flex flex-col gap-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-neutral-200"
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
              type="range"
              min={0}
              max={Math.max(duration, 0.01)}
              step={0.05}
              value={duration > 0 ? Math.min(current, duration) : 0}
              onChange={(e) => seek(Number(e.target.value))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              disabled={!Number.isFinite(duration) || duration <= 0}
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

      {loadError && (
        <p className="text-sm text-red-300">{loadError}</p>
      )}

      <section className="space-y-4 border-t border-neutral-800 pt-6">
        <h2 className="text-sm font-medium text-white">Leave feedback</h2>
        <Input
          id={`${idPrefix}-name`}
          label="Your name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Alex"
        />
        <Textarea
          id={`${idPrefix}-note`}
          label={`Note at ${formatAudioTime(current)}`}
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder="What you think at this moment in the track…"
          rows={3}
        />
        <Button
          type="button"
          loading={posting}
          onClick={() => void postTopLevel()}
          disabled={!newBody.trim()}
        >
          Post timestamped note
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-white">Comments</h2>
        {commentsError ? (
          <p className="text-sm text-amber-200/90">{commentsError}</p>
        ) : commentsLoading && session.comments.length === 0 ? (
          <p className="text-sm text-neutral-500">Loading comments…</p>
        ) : session.comments.length === 0 ? (
          <p className="text-sm text-neutral-500">No comments yet.</p>
        ) : (
          <ul className="space-y-4">
            {session.comments.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-neutral-800 bg-neutral-950/80 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    type="button"
                    className="text-left text-sm font-medium text-pink-400 hover:underline"
                    onClick={() => seek(c.secondsIntoTrack)}
                  >
                    {formatAudioTime(c.secondsIntoTrack)}
                  </button>
                  {isPostedByThisBrowser(token, c.id) && (
                    <button
                      type="button"
                      onClick={() =>
                        void deleteOwn(c.id).catch((err) =>
                          setLoadError(
                            err instanceof Error ? err.message : "Delete failed"
                          )
                        )
                      }
                      className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-red-300"
                      aria-label="Delete my comment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
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
                      <li key={r.id}>
                        <p className="text-xs text-neutral-500">
                          {r.displayName ?? "Anonymous"}
                        </p>
                        <p className="text-sm text-neutral-300">{r.body}</p>
                        {isPostedByThisBrowser(token, r.id) && (
                          <button
                            type="button"
                            onClick={() =>
                              void deleteOwn(r.id).catch((err) =>
                                setLoadError(
                                  err instanceof Error
                                    ? err.message
                                    : "Delete failed"
                                )
                              )
                            }
                            className="mt-1 text-xs text-neutral-600 hover:text-red-300"
                          >
                            Delete my reply
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3">
                  {replyTo === c.id ? (
                    <div className="space-y-2">
                      <Textarea
                        id={`${idPrefix}-reply-${c.id}`}
                        label="Reply"
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          loading={posting}
                          onClick={() => void postReply(c.id)}
                          disabled={!replyBody.trim()}
                        >
                          Send reply
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReplyTo(null);
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
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyTo(c.id)}
                    >
                      Reply
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-neutral-600">
        Powered by anr.fm — free music distribution for independent artists.
      </p>
    </div>
  );
}
