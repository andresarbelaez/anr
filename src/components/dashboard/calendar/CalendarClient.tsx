"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  applyCalendarOccurrenceDelete,
  applyCalendarOccurrenceSave,
  resolveCalendarMasterEvent,
} from "@/lib/calendar/calendar-event-mutations";
import { cn } from "@/lib/utils/cn";
import type {
  CalendarEvent,
  CalendarOccurrence,
  RecurringEditScope,
  ReleaseStatus,
} from "@/lib/supabase/types";
import {
  addDays,
  expandAllEvents,
  toDateStr,
  weekSunday,
} from "@/lib/utils/calendar-recurrence";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { EventModal, formToEventPayload, type EventFormData } from "./EventModal";
import { EventDetailModal, formToEventPayload as detailFormToPayload } from "./EventDetailModal";

type CalView = "month" | "week";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarClient() {
  const [view, setView] = useState<CalView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [releases, setReleases] = useState<
    Array<{ id: string; title: string; release_date: string; status: ReleaseStatus }>
  >([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();

  const [detailOccurrence, setDetailOccurrence] = useState<CalendarOccurrence | null>(null);

  const loadData = useCallback(async (rangeStart: Date, rangeEnd: Date) => {
    setLoading(true);
    const supabase = createClient();

    const [evtRes, relRes] = await Promise.all([
      supabase
        .from("calendar_events")
        .select("*")
        .gte("start_at", rangeStart.toISOString())
        .lte("start_at", rangeEnd.toISOString()),
      supabase
        .from("releases")
        .select("id, title, release_date, status")
        .not("release_date", "is", null),
    ]);

    if (!evtRes.error) setEvents((evtRes.data ?? []) as CalendarEvent[]);
    if (!relRes.error)
      setReleases(
        (relRes.data ?? []) as Array<{
          id: string;
          title: string;
          release_date: string;
          status: ReleaseStatus;
        }>
      );
    setLoading(false);
  }, []);

  useEffect(() => {
    const { rangeStart, rangeEnd } = getRange(view, currentDate);
    void loadData(rangeStart, rangeEnd);
  }, [view, currentDate, loadData]);

  function getRange(v: CalView, d: Date): { rangeStart: Date; rangeEnd: Date } {
    if (v === "month") {
      const rangeStart = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const rangeEnd = new Date(d.getFullYear(), d.getMonth() + 2, 0);
      return { rangeStart, rangeEnd };
    }
    const ws = weekSunday(d);
    return { rangeStart: ws, rangeEnd: addDays(ws, 6) };
  }

  const { rangeStart, rangeEnd } = getRange(view, currentDate);
  const occurrences: CalendarOccurrence[] = [
    ...expandAllEvents(events, rangeStart, rangeEnd),
    ...releases
      .filter((r) => r.release_date)
      .map(
        (r): CalendarOccurrence => ({
          key: `release:${r.release_date}:${r.id}`,
          masterId: r.id,
          occurrenceDate: r.release_date,
          startAt: new Date(r.release_date + "T00:00:00"),
          endAt: null,
          durationDays: 1,
          event: {
            id: r.id,
            user_id: "",
            title: r.title,
            description: null,
            start_at: r.release_date + "T00:00:00",
            end_at: null,
            all_day: true,
            color: "default",
            location: null,
            link: null,
            recurrence: null,
            recurrence_parent_id: null,
            recurrence_original_date: null,
            is_exception_cancelled: false,
            created_at: "",
            updated_at: "",
          },
          isRecurring: false,
          isCancelled: false,
          isReleaseDate: true,
        })
      ),
  ];

  function navigate(dir: -1 | 1) {
    setCurrentDate((d) => {
      if (view === "month") {
        return new Date(d.getFullYear(), d.getMonth() + dir, 1);
      }
      return addDays(d, dir * 7);
    });
  }

  const headerLabel =
    view === "month"
      ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : (() => {
          const ws = weekSunday(currentDate);
          const we = addDays(ws, 6);
          if (ws.getMonth() === we.getMonth())
            return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`;
          return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()} – ${MONTH_NAMES[we.getMonth()]} ${we.getDate()}, ${ws.getFullYear()}`;
        })();

  function openCreate(dateStr?: string) {
    setPrefillDate(dateStr ?? toDateStr(new Date()));
    setCreateOpen(true);
  }

  function openDetail(occ: CalendarOccurrence) {
    setDetailOccurrence(occ);
  }

  async function handleDetailSaveInternal(form: EventFormData, scope: RecurringEditScope) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const occ = detailOccurrence;
    if (!occ) return;

    const payload = detailFormToPayload(form, user.id);
    const masterEvent = resolveCalendarMasterEvent(events, occ);

    const { error } = await applyCalendarOccurrenceSave(supabase, {
      masterEvent,
      occurrence: occ,
      payload,
      scope,
    });

    setDetailOccurrence(null);
    if (!error) void loadData(rangeStart, rangeEnd);
  }

  async function handleDetailDelete(scope: RecurringEditScope) {
    const occ = detailOccurrence;
    if (!occ) return;
    const supabase = createClient();
    const masterEvent = resolveCalendarMasterEvent(events, occ);

    const { error } = await applyCalendarOccurrenceDelete(supabase, {
      masterEvent,
      occurrence: occ,
      scope,
    });

    setDetailOccurrence(null);
    if (!error) void loadData(rangeStart, rangeEnd);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentDate(new Date())}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-1 text-sm font-semibold text-white">{headerLabel}</span>
          {loading && <span className="text-xs text-neutral-500">loading…</span>}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-neutral-800 p-0.5">
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition",
                view === v
                  ? "bg-neutral-700 text-white"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <MonthView
          year={currentDate.getFullYear()}
          month={currentDate.getMonth()}
          occurrences={occurrences}
          onDayClick={(dateStr) => openCreate(dateStr)}
          onEventClick={openDetail}
        />
      ) : (
        <WeekView
          weekStart={weekSunday(currentDate)}
          occurrences={occurrences}
          onSlotClick={(dateStr) => openCreate(dateStr)}
          onEventClick={openDetail}
        />
      )}

      <button
        type="button"
        onClick={() => openCreate()}
        className="absolute bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-black shadow-lg transition hover:opacity-90"
        title="New event"
      >
        <CalendarDays className="h-5 w-5" />
      </button>

      <EventModal
        open={createOpen}
        prefillDate={prefillDate}
        onSave={async (form) => {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;
          await supabase.from("calendar_events").insert(formToEventPayload(form, user.id));
          setCreateOpen(false);
          void loadData(rangeStart, rangeEnd);
        }}
        onClose={() => setCreateOpen(false)}
      />

      <EventDetailModal
        open={!!detailOccurrence}
        occurrence={detailOccurrence}
        releaseInfo={
          detailOccurrence?.isReleaseDate
            ? releases.find((r) => r.id === detailOccurrence.masterId) ?? undefined
            : undefined
        }
        onSave={(form, scope) => void handleDetailSaveInternal(form, scope)}
        onDelete={(scope) => void handleDetailDelete(scope)}
        onClose={() => setDetailOccurrence(null)}
      />
    </div>
  );
}
