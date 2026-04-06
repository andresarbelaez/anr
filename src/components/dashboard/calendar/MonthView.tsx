"use client";

import { Disc3 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getEventColor, RELEASE_EVENT_STYLE } from "@/lib/utils/calendar-colors";
import {
  addDays,
  layoutWeek,
  startOfDay,
  toDateStr,
} from "@/lib/utils/calendar-recurrence";
import type { CalendarOccurrence } from "@/lib/supabase/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EVENT_TRACK_HEIGHT = 22; // px per track
const EVENT_ZONE_PADDING = 4; // px above first track

interface Props {
  year: number;
  month: number; // 0-based
  occurrences: CalendarOccurrence[];
  onDayClick: (date: string) => void;
  onEventClick: (occ: CalendarOccurrence) => void;
}

export function MonthView({ year, month, occurrences, onDayClick, onEventClick }: Props) {
  const today = toDateStr(new Date());

  // Build the grid: always show 6 weeks starting from the Sunday on/before the 1st
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = startOfDay(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay()); // back to Sunday

  const weeks: Date[][] = [];
  let cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-neutral-800">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium text-neutral-500"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex flex-1 flex-col divide-y divide-neutral-800">
        {weeks.map((week, wi) => {
          const { bars, overflowByDay } = layoutWeek(week, occurrences);
          const maxTrack = bars.length ? Math.max(...bars.map((b) => b.track)) + 1 : 0;
          const eventZoneHeight = Math.max(0, maxTrack) * EVENT_TRACK_HEIGHT + EVENT_ZONE_PADDING;

          return (
            <div key={wi} className="relative grid grid-cols-7 divide-x divide-neutral-800">
              {/* Day cells (date numbers + overflow counts) */}
              {week.map((day, di) => {
                const dateStr = toDateStr(day);
                const isToday = dateStr === today;
                const isCurrentMonth = day.getMonth() === month;
                const overflow = overflowByDay[di];

                return (
                  <div
                    key={di}
                    className="group relative cursor-pointer hover:bg-neutral-900/40"
                    style={{ minHeight: 90 + eventZoneHeight }}
                    onClick={() => onDayClick(dateStr)}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between px-2 pt-1.5 pb-1">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                          isToday
                            ? "bg-accent text-black"
                            : isCurrentMonth
                              ? "text-neutral-200"
                              : "text-neutral-600"
                        )}
                      >
                        {day.getDate()}
                      </span>
                    </div>

                    {/* Spacer for event bars */}
                    <div style={{ height: eventZoneHeight }} />

                    {/* Overflow chip */}
                    {overflow > 0 && (
                      <div className="px-2 pb-1">
                        <span className="text-xs text-neutral-500">
                          +{overflow} more
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Absolutely positioned event bars */}
              {bars.map((bar) => {
                const colorStyle = bar.occurrence.isReleaseDate
                  ? RELEASE_EVENT_STYLE
                  : getEventColor(bar.occurrence.event.color);

                const topPx =
                  EVENT_ZONE_PADDING +
                  bar.track * EVENT_TRACK_HEIGHT +
                  24 + // day number row height
                  6;  // pt-1.5

                const leftPct = (bar.startCol / 7) * 100;
                const widthPct = (bar.span / 7) * 100;

                return (
                  <div
                    key={bar.occurrence.key}
                    className={cn(
                      "absolute z-10 flex cursor-pointer items-center overflow-hidden border border-solid text-xs font-medium transition hover:opacity-95",
                      colorStyle.bg,
                      colorStyle.text,
                      colorStyle.border,
                      bar.continuedLeft ? "rounded-l-none pl-0" : "rounded-l-full pl-2",
                      bar.continuedRight ? "rounded-r-none pr-0" : "rounded-r-full pr-2"
                    )}
                    style={{
                      top: topPx,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      height: EVENT_TRACK_HEIGHT - 2,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(bar.occurrence);
                    }}
                    title={bar.occurrence.event.title}
                  >
                    {bar.continuedLeft && (
                      <span className="mr-1 text-xs opacity-50">◀</span>
                    )}
                    {bar.occurrence.isReleaseDate && (
                      <Disc3 className="mr-1 h-3 w-3 shrink-0 opacity-80" />
                    )}
                    <span className="truncate">{bar.occurrence.event.title}</span>
                    {bar.continuedRight && (
                      <span className="ml-1 text-xs opacity-50">▶</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
