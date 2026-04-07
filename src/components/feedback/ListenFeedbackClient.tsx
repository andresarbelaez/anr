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
import { S } from "@/components/studio/ui/s";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pause, Play, Trash2 } from "lucide-react";

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
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[#ecddc8] border-t-[#a85c10]"
          aria-hidden
        />
      </div>
    );
  }

  if (loadError && !session) {
    return (
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
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1
          className="text-xl font-semibold tracking-tight"
          style={{ color: S.textPrimary }}
        >
          {session.songTitle}
        </h1>
        <p className="text-sm" style={{ color: S.textMuted }}>
          {session.versionLabel}
        </p>
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
          <Button
            type="button"
            variant="circleLight"
            onClick={togglePlay}
            className="!h-12 !w-12 shrink-0"
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
          </Button>
          <div
            className={cn(
              "relative h-2 min-w-0 flex-1 overflow-hidden rounded-full",
              (!Number.isFinite(duration) || duration <= 0) && "opacity-50"
            )}
            style={{ background: S.borderFaint }}
          >
            <div
              className="pointer-events-none absolute left-0 top-0 h-full rounded-full"
              style={{
                width:
                  duration > 0
                    ? `${Math.min(100, Math.max(0, (current / duration) * 100))}%`
                    : "0%",
                background: S.accent,
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
          <div
            className="flex min-w-0 flex-1 justify-between text-xs tabular-nums"
            style={{ color: S.textMuted }}
          >
            <span className="text-left">{formatAudioTime(current)}</span>
            <span className="text-right">{formatAudioTime(duration)}</span>
          </div>
        </div>
      </div>

      {loadError && (
        <p className="text-sm" style={{ color: S.error }}>
          {loadError}
        </p>
      )}

      <section
        className="space-y-4 border-t pt-6"
        style={{ borderColor: S.border }}
      >
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ color: S.textSecondary, letterSpacing: "0.04em" }}
        >
          Leave feedback
        </h2>
        <Input
          id={`${idPrefix}-name`}
          label="Your name (optional)"
          appearance="studio"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Mom"
        />
        <Textarea
          id={`${idPrefix}-note`}
          label={`Note at ${formatAudioTime(current)}`}
          appearance="studio"
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder="What are you hearing that could be improved?"
          rows={3}
        />
        <Button
          type="button"
          variant="studioAccent"
          loading={posting}
          className="!rounded-sm !font-semibold"
          onClick={() => void postTopLevel()}
          disabled={!newBody.trim()}
        >
          Add comment
        </Button>
      </section>

      <section className="space-y-3">
        <h2
          className="text-sm font-semibold tracking-wide uppercase"
          style={{ color: S.textSecondary, letterSpacing: "0.04em" }}
        >
          Comments
        </h2>
        {commentsError ? (
          <p className="text-sm" style={{ color: S.warning }}>
            {commentsError}
          </p>
        ) : commentsLoading && session.comments.length === 0 ? (
          <p className="text-sm" style={{ color: S.textMuted }}>
            Loading comments…
          </p>
        ) : session.comments.length === 0 ? (
          <p className="text-sm" style={{ color: S.textMuted }}>
            No comments yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {session.comments.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border p-4"
                style={{
                  background: S.surface,
                  borderColor: S.border,
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    type="button"
                    className="text-left text-sm font-semibold hover:underline"
                    style={{ color: S.accent }}
                    onClick={() => seek(c.secondsIntoTrack)}
                  >
                    {formatAudioTime(c.secondsIntoTrack)}
                  </button>
                  {isPostedByThisBrowser(token, c.id) && (
                    <Button
                      type="button"
                      variant="bare"
                      onClick={() =>
                        void deleteOwn(c.id).catch((err) =>
                          setLoadError(
                            err instanceof Error ? err.message : "Delete failed"
                          )
                        )
                      }
                      className="rounded p-1 text-[#8a6040] hover:bg-black/[0.04] hover:text-[#a82820]"
                      aria-label="Delete my comment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-xs" style={{ color: S.textMuted }}>
                  {c.displayName ?? "Anonymous"}
                </p>
                <p
                  className="mt-2 whitespace-pre-wrap text-sm leading-relaxed"
                  style={{ color: S.textPrimary }}
                >
                  {c.body}
                </p>

                {c.replies.length > 0 && (
                  <ul
                    className="mt-3 space-y-2 border-l pl-3"
                    style={{ borderColor: S.borderFaint }}
                  >
                    {c.replies.map((r) => (
                      <li key={r.id}>
                        <p className="text-xs" style={{ color: S.textMuted }}>
                          {r.displayName ?? "Anonymous"}
                        </p>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: S.textSecondary }}
                        >
                          {r.body}
                        </p>
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
                            className="mt-1 text-xs hover:underline"
                            style={{ color: S.textFaint }}
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
                          disabled={!replyBody.trim()}
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

      <p
        className="text-center text-[11px] leading-relaxed"
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
    </div>
  );
}
