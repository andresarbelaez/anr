"use client";

import { useEffect, useRef } from "react";
import { Disc3 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getEventColor, RELEASE_EVENT_STYLE } from "@/lib/utils/calendar-colors";
import {
  HOUR_HEIGHT_PX,
  layoutDayEvents,
  startOfDay,
  toDateStr,
} from "@/lib/utils/calendar-recurrence";
import type { CalendarOccurrence } from "@/lib/supabase/types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TOTAL_HEIGHT = 24 * HOUR_HEIGHT_PX;

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

export function WeekView({ weekStart, occurrences, onSlotClick, onEventClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = toDateStr(new Date());

  // Scroll to 7am on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_HEIGHT_PX;
    }
  }, []);

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Day header row */}
      <div className="flex flex-shrink-0 border-b border-neutral-800">
        <div className="w-12 flex-shrink-0" />
        {days.map((day, i) => {
          const dateStr = toDateStr(day);
          const isToday = dateStr === today;
          return (
            <div
              key={i}
              className="flex flex-1 flex-col items-center border-l border-neutral-800 py-2"
            >
              <p className="text-xs text-neutral-500">{WEEKDAYS_SHORT[day.getDay()]}</p>
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                  isToday ? "bg-accent text-black" : "text-neutral-200"
                )}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      {allDayOccs.length > 0 && (
        <div className="flex flex-shrink-0 border-b border-neutral-800">
          <div className="flex w-12 flex-shrink-0 items-center justify-end pr-2">
            <span className="text-xs text-neutral-600">all&#8209;day</span>
          </div>
          {days.map((day, di) => {
            const dayStr = toDateStr(day);
            const dayEvents = allDayOccs.filter((o) => o.occurrenceDate === dayStr);
            return (
              <div key={di} className="min-h-[28px] flex-1 border-l border-neutral-800 px-0.5 py-0.5">
                {dayEvents.map((occ) => {
                  const c = occ.isReleaseDate ? RELEASE_EVENT_STYLE : getEventColor(occ.event.color);
                  return (
                    <div
                      key={occ.key}
                      className={cn(
                        "mb-0.5 flex cursor-pointer items-center gap-1 truncate rounded border border-solid px-1.5 py-0.5 text-xs",
                        c.bg, c.text, c.border
                      )}
                      onClick={() => onEventClick(occ)}
                      title={occ.event.title}
                    >
                      {occ.isReleaseDate && <Disc3 className="h-3 w-3 shrink-0 opacity-80" />}
                      <span className="truncate">{occ.event.title}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex flex-1 overflow-y-auto">
        {/* Time labels */}
        <div className="relative w-12 flex-shrink-0" style={{ height: TOTAL_HEIGHT }}>
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
        <div className="flex flex-1 divide-x divide-neutral-800">
          {days.map((day, di) => {
            const dateStr = toDateStr(day);
            const slots = layouts[di];

            return (
              <div
                key={di}
                className="relative flex-1"
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
  );
}
