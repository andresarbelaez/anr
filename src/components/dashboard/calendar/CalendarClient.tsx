"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import type {
  CalendarEvent,
  CalendarOccurrence,
} from "@/lib/supabase/types";
import {
  addDays,
  expandAllEvents,
  startOfDay,
  toDateStr,
} from "@/lib/utils/calendar-recurrence";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { EventModal, formToEventPayload, type EventFormData } from "./EventModal";
import { EventDetailModal, formToEventPayload as detailFormToPayload } from "./EventDetailModal";
import type { RecurringEditScope } from "./RecurringEditDialog";
import type { ReleaseStatus } from "@/lib/supabase/types";

type CalView = "month" | "week";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function weekSunday(d: Date): Date {
  const r = startOfDay(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function prevDayStr(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return toDateStr(d);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CalendarClient() {
  const [view, setView] = useState<CalView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [releases, setReleases] = useState<
    Array<{ id: string; title: string; release_date: string; status: ReleaseStatus }>
  >([]);
  const [loading, setLoading] = useState(false);

  // Create modal (new events only — goes straight to form)
  const [createOpen, setCreateOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();

  // Detail modal (view + edit existing events)
  const [detailOccurrence, setDetailOccurrence] = useState<CalendarOccurrence | null>(null);

  // ── Data loading ────────────────────────────────────────────────────────────

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

  // Recompute load range whenever view/date changes
  useEffect(() => {
    const { rangeStart, rangeEnd } = getRange(view, currentDate);
    void loadData(rangeStart, rangeEnd);
  }, [view, currentDate, loadData]);

  // ── Range helpers ──────────────────────────────────────────────────────────

  function getRange(v: CalView, d: Date): { rangeStart: Date; rangeEnd: Date } {
    if (v === "month") {
      const rangeStart = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const rangeEnd = new Date(d.getFullYear(), d.getMonth() + 2, 0);
      return { rangeStart, rangeEnd };
    }
    const ws = weekSunday(d);
    return { rangeStart: ws, rangeEnd: addDays(ws, 6) };
  }

  // ── Occurrence expansion ───────────────────────────────────────────────────

  const { rangeStart, rangeEnd } = getRange(view, currentDate);
  const occurrences: CalendarOccurrence[] = [
    ...expandAllEvents(events, rangeStart, rangeEnd),
    ...releases
      .filter((r) => r.release_date)
      .map(
        (r): CalendarOccurrence => ({
          key: `release:${r.release_date}:${r.id}`,
          masterId: r.id, // actual release UUID — used to look up release in state
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

  // ── Navigation ─────────────────────────────────────────────────────────────

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
          return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()} – ${MONTH_NAMES[we.getMonth()]} ${we.getDate()}, ${we.getFullYear()}`;
        })();

  // ── Event handlers ─────────────────────────────────────────────────────────

  function openCreate(dateStr?: string) {
    setPrefillDate(dateStr ?? toDateStr(new Date()));
    setCreateOpen(true);
  }

  function openDetail(occ: CalendarOccurrence) {
    setDetailOccurrence(occ);
  }

  async function handleDetailSaveInternal(form: EventFormData, scope: RecurringEditScope) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const occ = detailOccurrence;
    if (!occ) return;

    const payload = detailFormToPayload(form, user.id);
    const masterEvent = occ.event.recurrence_parent_id
      ? events.find((e) => e.id === occ.masterId) ?? occ.event
      : occ.event;

    if (scope === "all") {
      await supabase.from("calendar_events").update(payload).eq("id", masterEvent.id);
    } else if (scope === "this") {
      const existingException = events.find(
        (e) =>
          e.recurrence_parent_id === occ.masterId &&
          e.recurrence_original_date === occ.occurrenceDate
      );
      const exceptionPayload = {
        ...payload,
        recurrence: null,
        recurrence_parent_id: occ.masterId,
        recurrence_original_date: occ.occurrenceDate,
        is_exception_cancelled: false,
      };
      if (existingException) {
        await supabase.from("calendar_events").update(exceptionPayload).eq("id", existingException.id);
      } else {
        await supabase.from("calendar_events").insert(exceptionPayload);
      }
    } else if (scope === "following") {
      const newEndDate = prevDayStr(occ.occurrenceDate);
      const updatedRecurrence = masterEvent.recurrence
        ? { ...masterEvent.recurrence, end_date: newEndDate }
        : null;
      if (masterEvent.recurrence && occ.occurrenceDate === toDateStr(new Date(masterEvent.start_at))) {
        await supabase.from("calendar_events").update(payload).eq("id", masterEvent.id);
      } else {
        await supabase.from("calendar_events").update({ recurrence: updatedRecurrence }).eq("id", masterEvent.id);
        await supabase.from("calendar_events").insert({ ...payload, start_at: occ.startAt.toISOString() });
      }
    }

    setDetailOccurrence(null);
    void loadData(rangeStart, rangeEnd);
  }

  async function handleDetailDelete(scope: RecurringEditScope) {
    const occ = detailOccurrence;
    if (!occ) return;
    const supabase = createClient();
    const masterEvent = events.find((e) => e.id === occ.masterId) ?? occ.event;

    if (!occ.isRecurring || scope === "all") {
      await supabase.from("calendar_events").delete().eq("id", masterEvent.id);
    } else if (scope === "this") {
      await supabase.from("calendar_events").insert({
        user_id: masterEvent.user_id,
        title: masterEvent.title,
        start_at: occ.startAt.toISOString(),
        all_day: masterEvent.all_day,
        color: masterEvent.color,
        recurrence_parent_id: occ.masterId,
        recurrence_original_date: occ.occurrenceDate,
        is_exception_cancelled: true,
      });
    } else if (scope === "following") {
      const newEndDate = prevDayStr(occ.occurrenceDate);
      if (occ.occurrenceDate === toDateStr(new Date(masterEvent.start_at))) {
        await supabase.from("calendar_events").delete().eq("id", masterEvent.id);
      } else {
        const updatedRecurrence = masterEvent.recurrence
          ? { ...masterEvent.recurrence, end_date: newEndDate }
          : null;
        await supabase.from("calendar_events").update({ recurrence: updatedRecurrence }).eq("id", masterEvent.id);
      }
    }

    setDetailOccurrence(null);
    void loadData(rangeStart, rangeEnd);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800"
          >
            Today
          </button>
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-1 text-sm font-semibold text-white">{headerLabel}</span>
          {loading && (
            <span className="text-xs text-neutral-500">loading…</span>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-neutral-800 p-0.5">
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
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

      {/* Calendar body */}
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

      {/* Floating create button */}
      <button
        onClick={() => openCreate()}
        className="absolute bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-black shadow-lg transition hover:opacity-90"
        title="New event"
      >
        <CalendarDays className="h-5 w-5" />
      </button>

      {/* Create modal (new events only) */}
      <EventModal
        open={createOpen}
        prefillDate={prefillDate}
        onSave={async (form) => {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          await supabase.from("calendar_events").insert(formToEventPayload(form, user.id));
          setCreateOpen(false);
          void loadData(rangeStart, rangeEnd);
        }}
        onClose={() => setCreateOpen(false)}
      />

      {/* Detail modal (view + edit existing events) */}
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
