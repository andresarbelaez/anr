"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Pause, Play, X } from "lucide-react";
import { formatAudioTime } from "@/lib/utils/format-audio-time";
import { cn } from "@/lib/utils/cn";
import {
  listenPlayerAppearance,
  microappPlayerChrome,
  microappPlayerErrorText,
  microappPlayerPlayButtonClass,
  microappPlayerSeek,
  microappPlayerText,
} from "@/components/audio/microapp-audio-player-theme";

export type MicroappAudioTrack = {
  src: string;
  songTitle: string;
  versionLabel: string;
  /** Present for catalog-backed tracks; used with `libraryAutoplayGate`. */
  playRequestId?: number;
  /** Catalog storage path when this track comes from the library player context. */
  storagePath?: string;
};

export type LibraryAudioListSync = {
  registerToggle: (fn: (() => void) | null) => void;
  onPlayingChange: (playing: boolean) => void;
};

export type MicroappAudioPlayerBarHandle = {
  seek: (seconds: number) => void;
};

export type MicroappAudioPlayerBarVariant = "library" | "feedback";

/** `studioEmbed` — title-bar cream chrome. `listen` — `/listen` parchment card (`S.surface`). */
export type MicroappAudioPlayerBarAppearance = "studioEmbed" | "listen";

type Props = {
  track: MicroappAudioTrack | null;
  loading: boolean;
  error: string | null;
  onClear: () => void;
  /**
   * `library` — third column close control clears the catalog track (user can play again from the list).
   * `feedback` — hides the close column; there is no in-app affordance to reopen the bar after dismiss.
   */
  variant?: MicroappAudioPlayerBarVariant;
  /**
   * Visual skin. `listen` uses the public feedback listen page palette; layout matches studio embeds.
   */
  appearance?: MicroappAudioPlayerBarAppearance;
  /** Accessible name for the region */
  ariaLabel?: string;
  /** Fired when the browser cannot decode/play the current source. */
  onPlaybackError?: () => void;
  /** Fired on `timeupdate` and after imperative `seek` (e.g. `/listen` “note at” timestamp). */
  onTimeUpdate?: (seconds: number) => void;
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
  /**
   * Bar attaches with `border-t` at the bottom of the micro-app (default), or `border-b` at the top
   * (e.g. mobile Library so the FAB does not cover the player).
   */
  embeddedPlacement?: "bottom" | "top";
  /**
   * When set (studio Library embed only), registers pause/resume for list rows and mirrors
   * element play state into `CatalogPlayerProvider`.
   */
  libraryAudioListSync?: LibraryAudioListSync;
};

export const MicroappAudioPlayerBar = forwardRef<
  MicroappAudioPlayerBarHandle,
  Props
>(function MicroappAudioPlayerBar(
  {
    track,
    loading,
    error,
    onClear,
    variant = "library",
    appearance = "studioEmbed",
    ariaLabel = "Audio player",
    onPlaybackError,
    onTimeUpdate,
    autoPlayOnNewSource = true,
    libraryAutoplayGate,
    embeddedPlacement = "bottom",
    libraryAudioListSync,
  },
  ref
) {
  const showDismissColumn = variant !== "feedback";
  const isListen = appearance === "listen";
  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

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
        onTimeUpdateRef.current?.(seconds);
      },
    }),
    []
  );

  useEffect(() => {
    if (!libraryAudioListSync) return;
    const toggle = () => {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) {
        void a.play().catch(() => libraryAudioListSync.onPlayingChange(false));
      } else {
        a.pause();
      }
    };
    libraryAudioListSync.registerToggle(toggle);
    return () => libraryAudioListSync.registerToggle(null);
  }, [libraryAudioListSync]);

  useEffect(() => {
    if (!libraryAudioListSync) return;
    libraryAudioListSync.onPlayingChange(playing);
  }, [playing, libraryAudioListSync]);

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
      onTimeUpdateRef.current?.(0);
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

    const onTime = () => {
      const t = a.currentTime;
      setCurrent(t);
      onTimeUpdateRef.current?.(t);
    };
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
    onTimeUpdateRef.current?.(0);
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
    onTimeUpdateRef.current?.(value);
  };

  if (!visible) return null;

  const shell = isListen
    ? listenPlayerAppearance.shellClass
    : embeddedPlacement === "top"
      ? cn(
          "shrink-0 border-b px-4 py-3",
          microappPlayerChrome.surface,
          microappPlayerChrome.rule
        )
      : cn(
          "shrink-0 border-t px-4 py-3",
          microappPlayerChrome.surface,
          microappPlayerChrome.rule
        );

  const shellStyle: CSSProperties | undefined = isListen
    ? { ...listenPlayerAppearance.shellStyle }
    : undefined;

  const textTitle = isListen
    ? listenPlayerAppearance.title
    : microappPlayerText.title;
  const textSubtitle = isListen
    ? listenPlayerAppearance.subtitle
    : microappPlayerText.subtitle;
  const textMutedAction = isListen
    ? listenPlayerAppearance.mutedAction
    : microappPlayerText.mutedAction;
  const textError = isListen
    ? listenPlayerAppearance.errorText
    : microappPlayerErrorText;
  const playBtnClass = isListen
    ? listenPlayerAppearance.playButton
    : microappPlayerPlayButtonClass;
  const seekTrackClass = isListen
    ? listenPlayerAppearance.seek.track
    : microappPlayerSeek.track;
  const seekFillClass = isListen
    ? listenPlayerAppearance.seek.fill
    : microappPlayerSeek.fill;

  return (
    <div
      className={shell}
      style={shellStyle}
      role="region"
      aria-label={ariaLabel}
    >
      <audio
        ref={audioRef}
        preload={isListen ? "auto" : "metadata"}
        className="hidden"
        onError={() => onPlaybackError?.()}
      />

      {loading && (
        <div className="flex w-full items-center gap-3">
          <div className="h-10 w-10 shrink-0" aria-hidden />
          <p
            className={cn(
              "min-w-0 flex-1 text-center text-sm",
              textSubtitle
            )}
          >
            Loading audio…
          </p>
          {showDismissColumn ? (
            <div className="h-10 w-10 shrink-0" aria-hidden />
          ) : null}
        </div>
      )}

      {error && !loading && (
        <div className="flex w-full items-center gap-3">
          <div className="h-10 w-10 shrink-0" aria-hidden />
          <p
            className={cn("min-w-0 flex-1 text-center text-sm", textError)}
          >
            {error}
          </p>
          {showDismissColumn ? (
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a85c10]/35",
                textMutedAction
              )}
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" strokeWidth={2.2} />
            </button>
          ) : (
            <div className="h-10 w-10 shrink-0" aria-hidden />
          )}
        </div>
      )}

      {track && !loading && (
        <div className="flex w-full items-center gap-3">
          <div className="shrink-0">
            <button
              type="button"
              onClick={togglePlay}
              className={playBtnClass}
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
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p
              className={cn(
                "min-w-0 truncate text-left text-sm font-medium",
                textTitle
              )}
              title={`${track.songTitle} · ${track.versionLabel}`}
            >
              {track.songTitle}
              <span className={textSubtitle}> · </span>
              {track.versionLabel}
            </p>
            <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1 gap-y-0">
              <span
                className={cn(
                  "min-w-0 overflow-hidden text-left text-xs tabular-nums leading-none",
                  textSubtitle
                )}
              >
                {formatAudioTime(current)}
              </span>
              <div
                className={cn(
                  "relative h-2 min-w-0 overflow-hidden",
                  seekTrackClass,
                  (!Number.isFinite(duration) || duration <= 0) && "opacity-50"
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute left-0 top-0 h-full",
                    seekFillClass
                  )}
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
              <span
                className={cn(
                  "min-w-0 overflow-hidden text-right text-xs tabular-nums leading-none",
                  textSubtitle
                )}
              >
                {formatAudioTime(duration)}
              </span>
            </div>
          </div>

          {showDismissColumn ? (
            <div className="shrink-0 self-center">
              <button
                type="button"
                onClick={handleClose}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a85c10]/35",
                  textMutedAction
                )}
                aria-label="Close player"
              >
                <X className="h-5 w-5" strokeWidth={2.2} />
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
});
