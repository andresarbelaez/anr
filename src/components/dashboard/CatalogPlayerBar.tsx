"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, X } from "lucide-react";
import { useCatalogPlayer } from "@/contexts/catalog-player-context";
import { cn } from "@/lib/utils/cn";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CatalogPlayerBar() {
  const {
    activeTrack,
    playerLoading,
    playerError,
    clearCatalogPlayer,
  } = useCatalogPlayer();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  const visible = !!(activeTrack || playerLoading || playerError);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !activeTrack) return;

    a.src = activeTrack.src;
    a.load();
    setCurrent(0);
    setDuration(0);
    setPlaying(true);
    void a.play().catch(() => setPlaying(false));
  }, [activeTrack]);

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
  }, [activeTrack?.src]);

  const handleClose = () => {
    const a = audioRef.current;
    a?.pause();
    if (a) {
      a.removeAttribute("src");
      a.load();
    }
    clearCatalogPlayer();
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

  return (
    <div
      className={cn(
        "fixed bottom-0 left-56 right-0 z-20 border-t border-neutral-800 bg-neutral-950/95 px-4 py-3 backdrop-blur-md",
        "supports-[backdrop-filter]:bg-neutral-950/80"
      )}
      role="region"
      aria-label="Library audio player"
    >
      <audio ref={audioRef} preload="metadata" className="hidden" />

      {playerLoading && (
        <p className="text-center text-sm text-neutral-400">Loading audio…</p>
      )}

      {playerError && !playerLoading && (
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-3">
          <p className="max-w-md text-center text-sm text-red-300">
            {playerError}
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {activeTrack && !playerLoading && (
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
                {activeTrack.songTitle}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {activeTrack.versionLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
              aria-label="Close player"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid w-full grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center gap-1">
            <span className="flex h-10 min-w-0 items-center overflow-hidden text-left text-xs tabular-nums text-neutral-500">
              {formatTime(current)}
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
                value={
                  duration > 0
                    ? Math.min(current, duration)
                    : 0
                }
                onChange={(e) => seek(Number(e.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                disabled={!Number.isFinite(duration) || duration <= 0}
                aria-label="Seek"
              />
            </div>
            <span className="flex h-10 min-w-0 items-center justify-end overflow-hidden text-right text-xs tabular-nums text-neutral-500">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
