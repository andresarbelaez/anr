"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pause, Play, X } from "lucide-react";
import { formatAudioTime } from "@/lib/utils/format-audio-time";
import { cn } from "@/lib/utils/cn";

export type MicroappAudioTrack = {
  src: string;
  songTitle: string;
  versionLabel: string;
  /** Present for catalog-backed tracks; used with `libraryAutoplayGate`. */
  playRequestId?: number;
};

export type MicroappAudioPlayerBarHandle = {
  seek: (seconds: number) => void;
};

type Props = {
  variant: "dashboard" | "embedded";
  track: MicroappAudioTrack | null;
  loading: boolean;
  error: string | null;
  onClear: () => void;
  /** When false, hides the dismiss control (e.g. feedback embedded in studio). */
  showDismiss?: boolean;
  /** Accessible name for the region */
  ariaLabel?: string;
  /** Fired when the browser cannot decode/play the current source. */
  onPlaybackError?: () => void;
  /**
   * When true (default), start playback after binding a new `trackSrc`.
   * Set false for contexts where remounting should not blast audio (e.g. studio feedback detail).
   */
  autoPlayOnNewSource?: boolean;
  /**
   * When `autoPlayOnNewSource` is false and this is set (studio Library), autoplay only if the gate returns true
   * (new user `playCatalogVersion` vs rebounding the same `playRequestId` after remount).
   */
  libraryAutoplayGate?: (playRequestId: number) => boolean;
};

export const MicroappAudioPlayerBar = forwardRef<
  MicroappAudioPlayerBarHandle,
  Props
>(function MicroappAudioPlayerBar(
  {
    variant,
    track,
    loading,
    error,
    onClear,
    showDismiss = true,
    ariaLabel = "Audio player",
    onPlaybackError,
    autoPlayOnNewSource = true,
    libraryAutoplayGate,
  },
  ref
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  /** Last URL we pushed onto the element — avoids reload when parent passes a new `track` object for the same src. */
  const loadedSrcRef = useRef<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  const trackSrc = track?.src ?? null;
  const visible = !!(track || loading || error);

  useImperativeHandle(
    ref,
    () => ({
      seek: (seconds: number) => {
        const a = audioRef.current;
        if (!a || !Number.isFinite(seconds) || seconds < 0) return;
        a.currentTime = seconds;
        setCurrent(seconds);
      },
    }),
    []
  );

  // Bind audio to `trackSrc` only when the URL changes — not when `track` is a new object (e.g. feedback embed
  // recreating `{ src, songTitle, versionLabel }` each render). Each mounted bar still has its own <audio> element.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    if (!trackSrc) {
      loadedSrcRef.current = null;
      a.pause();
      a.removeAttribute("src");
      a.load();
      setCurrent(0);
      setDuration(0);
      setPlaying(false);
      return;
    }

    if (loadedSrcRef.current === trackSrc) return;
    loadedSrcRef.current = trackSrc;
    a.src = trackSrc;
    a.load();
    setCurrent(0);
    setDuration(0);

    let shouldPlay = false;
    if (autoPlayOnNewSource) {
      shouldPlay = true;
    } else if (
      libraryAutoplayGate != null &&
      track != null &&
      typeof track.playRequestId === "number"
    ) {
      shouldPlay = libraryAutoplayGate(track.playRequestId);
    }

    if (shouldPlay) {
      setPlaying(true);
      void a.play().catch(() => setPlaying(false));
    } else {
      setPlaying(false);
    }
  }, [
    trackSrc,
    autoPlayOnNewSource,
    libraryAutoplayGate,
    track?.playRequestId,
    track,
  ]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => setCurrent(a.currentTime);
    const onDuration = () => {
      const d = a.duration;
      setDuration(Number.isFinite(d) ? d : 0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("durationchange", onDuration);
    a.addEventListener("loadedmetadata", onDuration);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("durationchange", onDuration);
      a.removeEventListener("loadedmetadata", onDuration);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [trackSrc]);

  const handleClose = () => {
    const a = audioRef.current;
    loadedSrcRef.current = null;
    a?.pause();
    if (a) {
      a.removeAttribute("src");
      a.load();
    }
    onClear();
    setCurrent(0);
    setDuration(0);
    setPlaying(false);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      void a.play().catch(() => setPlaying(false));
    }
  };

  const seek = (value: number) => {
    const a = audioRef.current;
    if (!a || !Number.isFinite(duration) || duration <= 0) return;
    a.currentTime = value;
    setCurrent(value);
  };

  if (!visible) return null;

  const shell =
    variant === "dashboard"
      ? cn(
          "fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800 bg-neutral-950/95 px-4 py-3 backdrop-blur-md",
          "supports-[backdrop-filter]:bg-neutral-950/80"
        )
      : cn(
          "shrink-0 border-t border-neutral-800 bg-neutral-950/95 px-4 py-3 backdrop-blur-md",
          "supports-[backdrop-filter]:bg-neutral-950/80"
        );

  return (
    <div className={shell} role="region" aria-label={ariaLabel}>
      <audio
        ref={audioRef}
        preload="metadata"
        className="hidden"
        onError={() => onPlaybackError?.()}
      />

      {loading && (
        <p className="text-center text-sm text-neutral-400">Loading audio…</p>
      )}

      {error && !loading && (
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-3">
          <p className="max-w-md text-center text-sm text-red-300">{error}</p>
          {showDismiss && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {track && !loading && (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-1">
          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-neutral-200"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause
                  className="h-5 w-5"
                  fill="currentColor"
                  stroke="none"
                  strokeWidth={0}
                />
              ) : (
                <Play
                  className="h-5 w-5 pl-0.5"
                  fill="currentColor"
                  stroke="none"
                  strokeWidth={0}
                />
              )}
            </button>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-white">
                {track.songTitle}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {track.versionLabel}
              </p>
            </div>
            {showDismiss && (
              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                aria-label="Close player"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="grid w-full grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center gap-1">
            <span className="flex h-10 min-w-0 items-center overflow-hidden text-left text-xs tabular-nums text-neutral-500">
              {formatAudioTime(current)}
            </span>
            <div
              className={cn(
                "relative h-2 min-w-0 overflow-hidden rounded-full bg-neutral-800",
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
                aria-hidden
              />
              <input
                type="range"
                min={0}
                max={Math.max(duration, 0.01)}
                step={0.05}
                value={duration > 0 ? Math.min(current, duration) : 0}
                onChange={(e) => seek(Number(e.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                disabled={!Number.isFinite(duration) || duration <= 0}
                aria-label="Seek"
              />
            </div>
            <span className="flex h-10 min-w-0 items-center justify-end overflow-hidden text-right text-xs tabular-nums text-neutral-500">
              {formatAudioTime(duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
