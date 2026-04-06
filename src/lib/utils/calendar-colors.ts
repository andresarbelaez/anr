import type { CalendarColorKey } from "@/lib/supabase/types";

export const CALENDAR_COLORS: Record<
  CalendarColorKey,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  default: {
    label: "Default",
    dot: "bg-accent",
    bg: "bg-accent/35",
    text: "text-accent",
    border: "border-accent/55",
  },
  red: {
    label: "Red",
    dot: "bg-red-500",
    bg: "bg-red-950/90",
    text: "text-red-300",
    border: "border-red-600/70",
  },
  orange: {
    label: "Orange",
    dot: "bg-orange-500",
    bg: "bg-orange-950/90",
    text: "text-orange-300",
    border: "border-orange-600/70",
  },
  yellow: {
    label: "Yellow",
    dot: "bg-yellow-500",
    bg: "bg-yellow-950/90",
    text: "text-yellow-200",
    border: "border-yellow-600/70",
  },
  green: {
    label: "Green",
    dot: "bg-green-500",
    bg: "bg-green-950/90",
    text: "text-green-300",
    border: "border-green-600/70",
  },
  blue: {
    label: "Blue",
    dot: "bg-blue-500",
    bg: "bg-blue-950/90",
    text: "text-blue-300",
    border: "border-blue-600/70",
  },
  purple: {
    label: "Purple",
    dot: "bg-purple-500",
    bg: "bg-purple-950/90",
    text: "text-purple-300",
    border: "border-purple-600/70",
  },
  pink: {
    label: "Pink",
    dot: "bg-pink-500",
    bg: "bg-pink-950/90",
    text: "text-pink-300",
    border: "border-pink-600/70",
  },
};

/** Styles for release-date events (read-only, not editable). */
export const RELEASE_EVENT_STYLE = {
  dot: "bg-neutral-400",
  bg: "bg-neutral-800",
  text: "text-neutral-200",
  border: "border-neutral-500/60",
};

export function getEventColor(color: string) {
  return (
    CALENDAR_COLORS[color as CalendarColorKey] ?? CALENDAR_COLORS.default
  );
}

export const ALL_COLOR_KEYS: CalendarColorKey[] = [
  "default",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
];
