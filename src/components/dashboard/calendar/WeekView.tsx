"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Disc3 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getEventColor, RELEASE_EVENT_STYLE } from "@/lib/utils/calendar-colors";
import {
  HOUR_HEIGHT_PX,
  layoutDayEvents,
  layoutWeek,
  startOfDay,
  toDateStr,
} from "@/lib/utils/calendar-recurrence";
import type { CalendarOccurrence } from "@/lib/supabase/types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TOTAL_HEIGHT = 24 * HOUR_HEIGHT_PX;
/** Single-line all-day chips; fixed height keeps week column widths stable (flex min-width). */
const ALL_DAY_PILL_HEIGHT_PX = 22;
const ALL_DAY_TRACK_GAP_PX = 4;
const ALL_DAY_ZONE_PAD_TOP_PX = 4;

/** Same 1px gutter treatment as month view — avoids divide-x + border-l doubling (e.g. Sun|Mon). */
const WEEK_GRID_GUTTER = "month-cal-grid-gutter bg-neutral-800";

/** Day-column strip fills remaining width next to the time gutter (header / all-day). */
const WEEK_DAY_STRIP = "min-w-0 flex-1";

/**
 * Hide the native vertical scrollbar so it does not shrink the 7-column grid (avoids
 * compounding misalignment vs header / all-day; global ::-webkit-scrollbar width is 4px
 * and does not match scrollbar-gutter). Scroll still works via wheel / touch / trackpad.
 */
const HOUR_SCROLL_SCROLLER =
  "week-view-hour-scroll flex min-h-0 flex-1 gap-px overflow-y-auto overflow-x-hidden [-ms-overflow-style:none] [scrollbar-width:none]";

function fmtHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function fmtTime(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h < 12 ? "AM" : "PM";
  const hr = h % 12 || 12;
  return m === "00" ? `${hr} ${ampm}` : `${hr}:${m} ${ampm}`;
}

interface Props {
  weekStart: Date; // Sunday
  occurrences: CalendarOccurrence[];
  onSlotClick: (dateStr: string, hour: number) => void;
  onEventClick: (occ: CalendarOccurrence) => void;
}

const HOUR_SCROLL_MIN_THUMB_PX = 28;

export function WeekView({ weekStart, occurrences, onSlotClick, onEventClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = toDateStr(new Date());
  const [hourScroll, setHourScroll] = useState({ top: 0, scrollH: 0, clientH: 0 });

  const syncHourScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setHourScroll({
      top: el.scrollTop,
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTop = 7 * HOUR_HEIGHT_PX;

    const ro = new ResizeObserver(() => syncHourScroll());
    ro.observe(el);
    requestAnimationFrame(syncHourScroll);

    return () => {
      ro.disconnect();
    };
  }, [syncHourScroll]);

  useEffect(() => {
    requestAnimationFrame(syncHourScroll);
  }, [weekStart, occurrences, syncHourScroll]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Split occurrences into all-day vs timed
  const allDayOccs: CalendarOccurrence[] = [];
  const timedByDay: CalendarOccurrence[][] = Array.from({ length: 7 }, () => []);

  for (const occ of occurrences) {
    if (occ.event.all_day || occ.durationDays > 1) {
      allDayOccs.push(occ);
    } else {
      const dayIdx = days.findIndex(
        (d) => toDateStr(startOfDay(d)) === occ.occurrenceDate
      );
      if (dayIdx !== -1) timedByDay[dayIdx].push(occ);
    }
  }

  const layouts = timedByDay.map((events) => layoutDayEvents(events));

  const { bars: allDayBars, overflowByDay: allDayOverflowByDay } = layoutWeek(
    days,
    allDayOccs
  );
  const maxAllDayTrack = allDayBars.length
    ? Math.max(...allDayBars.map((b) => b.track))
    : -1;
  const allDayTrackCount = maxAllDayTrack + 1;
  const allDayPillsBottomPx =
    allDayTrackCount > 0
      ? ALL_DAY_ZONE_PAD_TOP_PX +
        allDayTrackCount * ALL_DAY_PILL_HEIGHT_PX +
        (allDayTrackCount - 1) * ALL_DAY_TRACK_GAP_PX
      : 0;
  const hasAllDayOverflow = allDayOverflowByDay.some((n) => n > 0);
  const allDayRowMinHeightPx = Math.max(
    28,
    allDayPillsBottomPx +
      (hasAllDayOverflow ? 14 : 6) +
      (allDayTrackCount > 0 ? 4 : 0)
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Day header row */}
      <div className={cn("flex flex-shrink-0 gap-px border-b border-neutral-800", WEEK_GRID_GUTTER)}>
        <div className="w-12 shrink-0 bg-neutral-950" />
        <div className={WEEK_DAY_STRIP}>
          <div className={cn("grid min-w-0 grid-cols-7 gap-px", WEEK_GRID_GUTTER)}>
          {days.map((day, i) => {
            const dateStr = toDateStr(day);
            const isToday = dateStr === today;
            return (
              <div
                key={i}
                className="flex min-w-0 flex-col items-center bg-neutral-950 py-2"
              >
                <p className="text-xs text-neutral-500">{WEEKDAYS_SHORT[day.getDay()]}</p>
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                    isToday ? "bg-accent text-[#fdf8f0]" : "text-neutral-200"
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* All-day row — same spanning layout as month view (layoutWeek) */}
      {allDayOccs.length > 0 && (
        <div className={cn("flex flex-shrink-0 gap-px border-b border-neutral-800", WEEK_GRID_GUTTER)}>
          <div className="flex w-12 shrink-0 items-center justify-end bg-neutral-950 pr-2">
            <span className="text-xs text-neutral-600">all&#8209;day</span>
          </div>
          <div className={cn("relative", WEEK_DAY_STRIP)}>
            <div
              className={cn("grid min-w-0 grid-cols-7 gap-px", WEEK_GRID_GUTTER)}
              style={{ minHeight: allDayRowMinHeightPx }}
            >
              {days.map((_, di) => (
                <div
                  key={di}
                  className="flex min-w-0 flex-col justify-end bg-neutral-950 pb-0.5 pt-1"
                >
                  {allDayOverflowByDay[di] > 0 && (
                    <span className="text-center text-[10px] leading-none text-neutral-500">
                      +{allDayOverflowByDay[di]} more
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden px-0.5 pt-0.5">
              {allDayBars.map((bar) => {
                const c = bar.occurrence.isReleaseDate
                  ? RELEASE_EVENT_STYLE
                  : getEventColor(bar.occurrence.event.color);
                const leftPct = (bar.startCol / 7) * 100;
                const widthPct = (bar.span / 7) * 100;
                const topPx =
                  ALL_DAY_ZONE_PAD_TOP_PX +
                  bar.track * (ALL_DAY_PILL_HEIGHT_PX + ALL_DAY_TRACK_GAP_PX);
                return (
                  <div
                    key={bar.occurrence.key}
                    className={cn(
                      "pointer-events-auto absolute flex cursor-pointer items-center overflow-hidden border border-solid text-xs font-medium leading-none transition hover:opacity-95",
                      c.bg,
                      c.text,
                      c.border,
                      bar.continuedLeft ? "rounded-l-none pl-0" : "rounded-l-full pl-2",
                      bar.continuedRight ? "rounded-r-none pr-0" : "rounded-r-full pr-2"
                    )}
                    style={{
                      top: topPx,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      height: ALL_DAY_PILL_HEIGHT_PX - 2,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(bar.occurrence);
                    }}
                    title={bar.occurrence.event.title}
                  >
                    {bar.continuedLeft && (
                      <span className="mr-0.5 shrink-0 text-[10px] opacity-50">◀</span>
                    )}
                    {bar.occurrence.isReleaseDate && (
                      <Disc3 className="mr-1 h-3 w-3 shrink-0 opacity-80" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {bar.occurrence.event.title}
                    </span>
                    {bar.continuedRight && (
                      <span className="ml-0.5 shrink-0 text-[10px] opacity-50">▶</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable time grid — overlay indicator floats on the right (no layout width) */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={syncHourScroll}
          className={cn(HOUR_SCROLL_SCROLLER, WEEK_GRID_GUTTER)}
        >
          {/* Time labels */}
          <div
            className="relative w-12 shrink-0 bg-neutral-950"
            style={{ height: TOTAL_HEIGHT }}
          >
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-right text-xs text-neutral-600"
                style={{ top: h * HOUR_HEIGHT_PX - 8, height: HOUR_HEIGHT_PX }}
              >
                {h > 0 ? fmtHour(h) : ""}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="min-w-0 flex-1">
            <div
              className={cn("grid min-w-0 grid-cols-7 gap-px", WEEK_GRID_GUTTER)}
              style={{ height: TOTAL_HEIGHT }}
            >
            {days.map((day, di) => {
              const dateStr = toDateStr(day);
              const slots = layouts[di];

              return (
                <div
                  key={di}
                  className="relative min-w-0 bg-neutral-950"
                  style={{ height: TOTAL_HEIGHT }}
                >
                  {/* Hour lines + clickable slots */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute w-full cursor-pointer border-t border-neutral-800/60 hover:bg-neutral-900/30"
                      style={{ top: h * HOUR_HEIGHT_PX, height: HOUR_HEIGHT_PX }}
                      onClick={() => onSlotClick(dateStr, h)}
                    />
                  ))}

                  {/* Current time indicator */}
                  {toDateStr(day) === today && (() => {
                    const now = new Date();
                    const minutesFromMidnight = now.getHours() * 60 + now.getMinutes();
                    const topPx = (minutesFromMidnight / 60) * HOUR_HEIGHT_PX;
                    return (
                      <div
                        className="pointer-events-none absolute z-20 flex w-full items-center"
                        style={{ top: topPx }}
                      >
                        <div className="h-2 w-2 rounded-full bg-accent" />
                        <div className="h-px flex-1 bg-accent" />
                      </div>
                    );
                  })()}

                  {/* Timed events */}
                  {slots.map(({ occurrence, col, totalCols, topPx, heightPx }) => {
                    const c = occurrence.isReleaseDate
                      ? RELEASE_EVENT_STYLE
                      : getEventColor(occurrence.event.color);
                    const colWidth = 100 / totalCols;
                    return (
                      <div
                        key={occurrence.key}
                        className={cn(
                          "absolute z-10 cursor-pointer overflow-hidden rounded border px-1.5 py-0.5 text-xs font-medium transition hover:opacity-90",
                          c.bg, c.text, c.border
                        )}
                        style={{
                          top: topPx,
                          height: Math.max(heightPx - 2, 22),
                          left: `calc(${col * colWidth}% + 1px)`,
                          width: `calc(${colWidth}% - 2px)`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(occurrence);
                        }}
                        title={occurrence.event.title}
                      >
                        <p className="flex items-center gap-1 truncate font-medium leading-tight">
                          {occurrence.isReleaseDate && (
                            <Disc3 className="h-3 w-3 shrink-0 opacity-80" />
                          )}
                          <span className="truncate">{occurrence.event.title}</span>
                        </p>
                        {heightPx >= 40 && (
                          <p className="truncate leading-tight opacity-70">
                            {fmtTime(occurrence.startAt)}
                            {occurrence.endAt && ` – ${fmtTime(occurrence.endAt)}`}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            </div>
          </div>
        </div>

        {(() => {
          const { top: st, scrollH, clientH } = hourScroll;
          const canScroll = clientH > 0 && scrollH > clientH + 0.5;
          if (!canScroll) return null;
          const maxScroll = scrollH - clientH;
          const trackH = clientH;
          const rawThumb = (clientH / scrollH) * trackH;
          const thumbH = Math.min(trackH, Math.max(HOUR_SCROLL_MIN_THUMB_PX, rawThumb));
          const thumbTop =
            maxScroll <= 0 ? 0 : (st / maxScroll) * Math.max(0, trackH - thumbH);
          return (
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-30 flex w-2 justify-center pr-0.5"
              aria-hidden
            >
              <div className="relative h-full w-1 shrink-0 rounded-full bg-neutral-700/25">
                <div
                  className="absolute left-0 right-0 rounded-full bg-neutral-500/70 shadow-sm"
                  style={{ height: thumbH, top: thumbTop }}
                />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
