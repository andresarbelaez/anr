import { S } from "@/components/studio/ui/s";

/**
 * Studio micro-app embedded audio bar — visually aligned with `StudioWindow` title bar
 * (`#ede0cc` surface, `#d4b896` rules). Typography tracks studio `S` tokens on parchment.
 */
export const microappPlayerChrome = {
  /** Matches `StudioWindow` title bar `background` */
  surface: "bg-[#ede0cc]",
  /** Matches title bar `borderBottom` / separator tone */
  rule: "border-[#d4b896]",
} as const;

export const microappPlayerText = {
  /** Primary line — same as window title `color` `#5a3518` */
  title: "text-[#5a3518]",
  /** Delimiter, time codes, loading — `S.textMuted` */
  subtitle: "text-[#8a6040]",
  /** Close/dismiss — window chrome X default + hover (see `StudioWindow`) */
  mutedAction:
    "text-[#8a6040] hover:bg-[rgba(168,92,16,0.10)] hover:text-[#a85c10]",
} as const;

/** Filled accent control; readable on title-bar cream, echoes `S.accent` */
export const microappPlayerPlayButtonClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#924d0e] bg-[#a85c10] p-0 text-white shadow-sm transition-colors hover:bg-[#924d0e] hover:border-[#7a420c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a85c10]/45 disabled:pointer-events-none disabled:opacity-40";

export const microappPlayerSeek = {
  track: "rounded-full bg-[#d4b896]/55",
  fill: "bg-[#5a3518]",
} as const;

/** Errors on light chrome — `S.error` */
export const microappPlayerErrorText = "text-[#a82820]";

/**
 * Public `/listen` page — same bar layout as studio embeds; surfaces match `ListenPage` / `S`
 * (card cream, parchment borders, accent scrubber).
 */
export const listenPlayerAppearance = {
  shellClass: "shrink-0 rounded-lg border px-4 py-3 shadow-sm",
  shellStyle: {
    background: S.surface,
    borderColor: S.border,
  } as const,
  /** Combined title line — `S.textPrimary` + `S.textMuted` delimiter */
  title: "text-[#1e1008]",
  subtitle: "text-[#8a6040]",
  mutedAction:
    "text-[#8a6040] hover:bg-[rgba(168,92,16,0.10)] hover:text-[#a85c10]",
  errorText: "text-[#a82820]",
  /** Same filled accent as studio bar; readable on `S.surface` */
  playButton: microappPlayerPlayButtonClass,
  seek: {
    track: "rounded-full bg-[#ecddc8]",
    fill: "rounded-full bg-[#a85c10]",
  },
} as const;

/**
 * Default props for `MicroappAudioPlayerBar` in studio **Library** and **Feedback** embeds.
 * Spread first, then set **`variant`**: `"library"` (close column) vs `"feedback"` (no close column).
 * Then pass `track`, `loading`, `error`, `onClear`, `ariaLabel`, and placement-specific props
 * (`embeddedPlacement`, `libraryAutoplayGate`, `ref`, `onPlaybackError`).
 */
export const studioMicroappAudioBarSharedEmbedProps = {
  autoPlayOnNewSource: false,
  variant: "library" as const,
} as const;
