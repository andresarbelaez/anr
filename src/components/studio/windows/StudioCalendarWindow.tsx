"use client";

import { CalendarClient } from "@/components/dashboard/calendar/CalendarClient";
import { useStudioWindowChrome } from "@/components/studio/studio-window-chrome";

/**
 * CSS overrides that remap Tailwind's neutral-dark palette → warm light studio
 * tones for every element that is a DOM descendant of `.studio-cal`.
 * Position-fixed children (modals) are also descendants in the DOM so they
 * get the same treatment.
 */
const STUDIO_CAL_CSS = `
/* ── Layout: bound CalendarClient to the studio window (no height:auto — that
   sizes to full content and breaks inner overflow-y on week view). ───────── */
.studio-cal > div:first-child {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  min-width: 0 !important;
  display: flex !important;
  flex-direction: column !important;
}

/* ── Text colors ─────────────────────────────────────────────────────────── */
.studio-cal .text-white,
.studio-cal .hover\\:text-white:hover      { color: #1e1008 !important; }
.studio-cal .text-neutral-200              { color: #2a1a0a !important; }
.studio-cal .text-neutral-300              { color: #5a3518 !important; }
.studio-cal .text-neutral-400              { color: #7a5030 !important; }
.studio-cal .text-neutral-500              { color: #8a6040 !important; }
.studio-cal .text-neutral-600              { color: #a07050 !important; }
.studio-cal .text-black                    { color: #1e1008 !important; }

/* ── Background colors ───────────────────────────────────────────────────── */
.studio-cal .bg-neutral-950                { background-color: #fdf8f0 !important; }
.studio-cal .bg-neutral-900                { background-color: #f5ede0 !important; }
.studio-cal .bg-neutral-800,
.studio-cal .hover\\:bg-neutral-800:hover  { background-color: #e8d4bb !important; }
.studio-cal .bg-neutral-700                { background-color: #d4b896 !important; }
.studio-cal .bg-neutral-600                { background-color: #c0a070 !important; }
.studio-cal .bg-accent                     { background-color: #a85c10 !important; }

/* opacity / slash variants */
.studio-cal .bg-neutral-900\\/50  { background-color: rgba(245,237,224,0.5) !important; }
.studio-cal .bg-neutral-900\\/40,
.studio-cal .hover\\:bg-neutral-900\\/40:hover { background-color: rgba(245,237,224,0.4) !important; }

/* Month grid gutters (gap-px) — match border-neutral-800 so lines are not darker than borders */
.studio-cal .month-cal-grid-gutter         { background-color: #d4b896 !important; }

/* ── Border colors ───────────────────────────────────────────────────────── */
.studio-cal .border-neutral-800            { border-color: #d4b896 !important; }
.studio-cal .border-neutral-700,
.studio-cal .hover\\:border-neutral-700:hover { border-color: #c0a070 !important; }
.studio-cal .border-neutral-600            { border-color: #a07050 !important; }

/* ── Divide utilities ────────────────────────────────────────────────────── */
.studio-cal .divide-neutral-800 > :not([hidden]) ~ :not([hidden]),
.studio-cal .divide-y           > :not([hidden]) ~ :not([hidden]),
.studio-cal .divide-x           > :not([hidden]) ~ :not([hidden]) {
  border-color: #d4b896 !important;
}

/* ── Modal / dialog overlays ─────────────────────────────────────────────── */
.studio-cal .bg-black\\/60,
.studio-cal .bg-black\\/50 { background-color: rgba(30,16,8,0.55) !important; }

/* Input fields inside modals */
.studio-cal input:not([type="range"]),
.studio-cal textarea,
.studio-cal select {
  background-color: #f5ede0 !important;
  border-color:     #d4b896 !important;
  color:            #1e1008 !important;
}
/* SplitDateInput (MM/DD/YYYY): keep tight — generic inputs may gain padding later */
.studio-cal input.split-date-input:not([type="range"]) {
  padding-inline: 0 !important;
}
.studio-cal input:focus,
.studio-cal textarea:focus,
.studio-cal select:focus {
  border-color: #a85c10 !important;
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(168,92,16,0.20) !important;
}

/* Placeholder text */
.studio-cal ::placeholder { color: #b89070 !important; }
`;

function StudioCalendarInner() {
  const chrome = useStudioWindowChrome();
  return <CalendarClient studioChrome={chrome} />;
}

export function StudioCalendarWindow() {
  return (
    <div
      className="studio-cal"
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#fdf8f0",
      }}
    >
      <style>{STUDIO_CAL_CSS}</style>
      <StudioCalendarInner />
    </div>
  );
}
