"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { CatalogSong, Release } from "@/lib/supabase/types";

export type CrmCollabTarget =
  | { kind: "release"; id: string; label: string }
  | { kind: "catalog"; id: string; label: string };

type FlatOpt =
  | { kind: "release"; r: Release }
  | { kind: "catalog"; s: CatalogSong };

type Props = {
  releases: Release[];
  catalogSongs: CatalogSong[];
  value: CrmCollabTarget | null;
  onChange: (next: CrmCollabTarget | null) => void;
  label?: string;
  disabled?: boolean;
  /** When lists are still fetching (avoid “empty” copy while data loads). */
  loading?: boolean;
  placeholder?: string;
};

function itemMatches(query: string, ...parts: string[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return parts.some((p) => p.toLowerCase().includes(q));
}

export function CrmCollaborationTargetPicker({
  releases,
  catalogSongs,
  value,
  onChange,
  label = "Release or library song",
  disabled = false,
  loading = false,
  placeholder = "Search releases and library…",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();
  const optionBaseId = useId().replace(/:/g, "");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeIndexRef = useRef<number | null>(null);
  activeIndexRef.current = activeIndex;

  const empty = releases.length === 0 && catalogSongs.length === 0;
  const isDisabled = disabled || loading || empty;

  const filteredReleases = useMemo(
    () =>
      releases.filter((r) =>
        itemMatches(query, r.title, String(r.status))
      ),
    [releases, query]
  );
  const filteredSongs = useMemo(
    () => catalogSongs.filter((s) => itemMatches(query, s.title)),
    [catalogSongs, query]
  );

  const flatOptions: FlatOpt[] = useMemo(() => {
    const out: FlatOpt[] = [];
    for (const r of filteredReleases) out.push({ kind: "release", r });
    for (const s of filteredSongs) out.push({ kind: "catalog", s });
    return out;
  }, [filteredReleases, filteredSongs]);

  const flatRef = useRef(flatOptions);
  flatRef.current = flatOptions;

  const showReleases = filteredReleases.length > 0;
  const showSongs = filteredSongs.length > 0;
  const noMatches = query.trim() && !showReleases && !showSongs;

  const closePanel = useCallback(() => {
    setOpen(false);
    setActiveIndex(null);
  }, []);

  const selectRelease = useCallback(
    (r: Release) => {
      onChange({
        kind: "release",
        id: r.id,
        label: `${r.title} (${r.status})`,
      });
      closePanel();
    },
    [onChange, closePanel]
  );

  const selectSong = useCallback(
    (s: CatalogSong) => {
      onChange({
        kind: "catalog",
        id: s.id,
        label: s.title,
      });
      closePanel();
    },
    [onChange, closePanel]
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closePanel();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, closePanel]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(null);
    const t = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex(null);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  useEffect(() => {
    setActiveIndex((i) => {
      if (i === null) return null;
      const n = flatOptions.length;
      if (n === 0) return null;
      return Math.min(i, n - 1);
    });
  }, [flatOptions]);

  useEffect(() => {
    if (activeIndex === null) return;
    const el = optionRefs.current[activeIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onPanelKeyDownCapture = useCallback(
    (e: React.KeyboardEvent) => {
      const n = flatRef.current.length;
      if (n === 0 && e.key !== "Escape") return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setActiveIndex((i) => (i === null ? 0 : Math.min(i + 1, n - 1)));
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setActiveIndex((i) => {
            if (i === null) return null;
            if (i <= 0) return null;
            return i - 1;
          });
          break;
        }
        case "Home": {
          if (n > 0) {
            e.preventDefault();
            setActiveIndex(0);
          }
          break;
        }
        case "End": {
          if (n > 0) {
            e.preventDefault();
            setActiveIndex(n - 1);
          }
          break;
        }
        case "Enter": {
          const i = activeIndexRef.current;
          const flat = flatRef.current;
          if (i !== null && i >= 0 && i < flat.length) {
            e.preventDefault();
            const o = flat[i];
            if (o.kind === "release") selectRelease(o.r);
            else selectSong(o.s);
          } else if (e.target === searchRef.current) {
            e.preventDefault();
          }
          break;
        }
        default:
          break;
      }
    },
    [selectRelease, selectSong]
  );

  const optionId = (index: number) => `${optionBaseId}-opt-${index}`;

  let flatIndex = 0;

  return (
    <div ref={rootRef} className="relative space-y-1.5">
      {label ? (
        <span className="block text-sm font-medium text-neutral-300" id={`${listId}-label`}>
          {label}
        </span>
      ) : null}
      <button
        type="button"
        disabled={isDisabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-labelledby={label ? `${listId}-label` : undefined}
        onClick={() => !isDisabled && setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-left text-sm text-white transition focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-2 ring-white/20 border-transparent"
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !value && "text-neutral-500"
          )}
        >
          {value
            ? value.label
            : loading
              ? "Loading releases and library…"
              : empty
                ? "No releases or songs yet"
                : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-neutral-500 transition",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Choose release or library song"
          onKeyDownCapture={onPanelKeyDownCapture}
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950 shadow-xl"
        >
          <div className="border-b border-neutral-800 p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                autoComplete="off"
                aria-controls={listId}
                aria-activedescendant={
                  activeIndex !== null && flatOptions.length > 0
                    ? optionId(activeIndex)
                    : undefined
                }
                className="h-9 w-full rounded-md border border-neutral-700 bg-neutral-900 pl-9 pr-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {noMatches ? (
              <p className="px-3 py-6 text-center text-sm text-neutral-500">
                No matches for &ldquo;{query.trim()}&rdquo;
              </p>
            ) : (
              <>
                {showReleases && (
                  <div className="px-1 pb-1">
                    <div
                      className="flex items-center gap-2 px-2 py-1.5"
                      role="presentation"
                    >
                      <span
                        className="h-px flex-1 bg-emerald-900/80"
                        aria-hidden
                      />
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90">
                        Releases
                      </span>
                      <span
                        className="h-px flex-1 bg-emerald-900/80"
                        aria-hidden
                      />
                    </div>
                    <ul className="space-y-0.5">
                      {filteredReleases.map((r) => {
                        const i = flatIndex++;
                        const isValue =
                          value?.kind === "release" && value.id === r.id;
                        const isActive = activeIndex === i;
                        return (
                          <li key={r.id}>
                            <button
                              type="button"
                              id={optionId(i)}
                              ref={(el) => {
                                optionRefs.current[i] = el;
                              }}
                              role="option"
                              aria-selected={isValue}
                              className={cn(
                                "w-full rounded-md px-2 py-2 text-left text-sm text-neutral-200 hover:bg-emerald-950/50 hover:text-white",
                                isValue && "bg-emerald-950/40",
                                isActive &&
                                  "bg-emerald-950/60 ring-1 ring-emerald-700/50"
                              )}
                              onMouseEnter={() => setActiveIndex(i)}
                              onClick={() => selectRelease(r)}
                            >
                              <span className="font-medium">{r.title}</span>
                              <span className="ml-1.5 text-xs text-neutral-500">
                                ({r.status})
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {showSongs && (
                  <div className="px-1 pb-1 pt-0.5">
                    <div
                      className="flex items-center gap-2 px-2 py-1.5"
                      role="presentation"
                    >
                      <span
                        className="h-px flex-1 bg-neutral-700"
                        aria-hidden
                      />
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                        Library
                      </span>
                      <span
                        className="h-px flex-1 bg-neutral-700"
                        aria-hidden
                      />
                    </div>
                    <ul className="space-y-0.5">
                      {filteredSongs.map((s) => {
                        const i = flatIndex++;
                        const isValue =
                          value?.kind === "catalog" && value.id === s.id;
                        const isActive = activeIndex === i;
                        return (
                          <li key={s.id}>
                            <button
                              type="button"
                              id={optionId(i)}
                              ref={(el) => {
                                optionRefs.current[i] = el;
                              }}
                              role="option"
                              aria-selected={isValue}
                              className={cn(
                                "w-full rounded-md px-2 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800/90 hover:text-white",
                                isValue && "bg-neutral-800",
                                isActive &&
                                  "bg-neutral-700/90 ring-1 ring-neutral-500/50"
                              )}
                              onMouseEnter={() => setActiveIndex(i)}
                              onClick={() => selectSong(s)}
                            >
                              {s.title}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
