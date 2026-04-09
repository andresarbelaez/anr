"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  applyCalendarOccurrenceDelete,
  applyCalendarOccurrenceSave,
  resolveCalendarMasterEvent,
} from "@/lib/calendar/calendar-event-mutations";
import type { StudioWindowChromeApi } from "@/components/studio/studio-window-chrome";
import { StudioMicroappPrimaryButton } from "@/components/studio/ui/StudioMicroappPrimaryButton";
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
import { StudioMicroappSkeletonCalendarGridEmbedded } from "@/components/studio/ui/studio-microapp-skeletons";
import {
  studioCalendarSessionKey,
  useStudioMicroappSessionCacheOptional,
} from "@/contexts/studio-microapp-session-cache";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { EventModal, formToEventPayload, type EventFormData } from "./EventModal";
import { EventDetailModal, formToEventPayload as detailFormToPayload } from "./EventDetailModal";

type CalView = "month" | "week";

function getCalendarDataRange(
  v: CalView,
  d: Date
): { rangeStart: Date; rangeEnd: Date } {
  if (v === "month") {
    const rangeStart = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const rangeEnd = new Date(d.getFullYear(), d.getMonth() + 2, 0);
    return { rangeStart, rangeEnd };
  }
  const ws = weekSunday(d);
  return { rangeStart: ws, rangeEnd: addDays(ws, 6) };
}

type CalStackEntry =
  | { type: "grid" }
  | { type: "new"; prefillDate?: string }
  | { type: "detail"; occurrence: CalendarOccurrence };

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

export function CalendarClient({
  studioChrome = null,
}: {
  /** When set, creation/detail use in-window stack + title-bar nav instead of modals. */
  studioChrome?: StudioWindowChromeApi | null;
} = {}) {
  const stackMode = !!studioChrome;

  const [view, setView] = useState<CalView>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [releases, setReleases] = useState<
    Array<{ id: string; title: string; release_date: string; status: ReleaseStatus }>
  >([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [prefillDateModal, setPrefillDateModal] = useState<string | undefined>();
  const [detailOccurrence, setDetailOccurrence] =
    useState<CalendarOccurrence | null>(null);

  const [past, setPast] = useState<CalStackEntry[]>([]);
  const [currentStack, setCurrentStack] = useState<CalStackEntry>({
    type: "grid",
  });
  const [future, setFuture] = useState<CalStackEntry[]>([]);
  const [newPanelKey, setNewPanelKey] = useState(0);
  const detailChromeBackRef = useRef<() => boolean>(() => false);
  const stackRef = useRef({ past, currentStack });
  stackRef.current = { past, currentStack };

  const sessionCache = useStudioMicroappSessionCacheOptional();

  const refetchCalendarData = useCallback(async () => {
    const { rangeStart, rangeEnd } = getCalendarDataRange(view, currentDate);
    const key = studioCalendarSessionKey(view, rangeStart, rangeEnd);
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
    const ev = (evtRes.data ?? []) as CalendarEvent[];
    const rel = (relRes.data ?? []) as Array<{
      id: string;
      title: string;
      release_date: string;
      status: ReleaseStatus;
    }>;
    if (!evtRes.error) setEvents(ev);
    if (!relRes.error) setReleases(rel);
    sessionCache?.putCalendar(key, { events: ev, releases: rel });
  }, [view, currentDate, sessionCache]);

  useEffect(() => {
    const { rangeStart, rangeEnd } = getCalendarDataRange(view, currentDate);
    const key = studioCalendarSessionKey(view, rangeStart, rangeEnd);
    const snap = sessionCache?.takeCalendar(key);
    if (snap) {
      setEvents(snap.events);
      setReleases(snap.releases);
    }
    if (!snap) setLoading(true);
    let cancelled = false;
    void (async () => {
      await refetchCalendarData();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [view, currentDate, sessionCache, refetchCalendarData]);

  const { rangeStart, rangeEnd } = getCalendarDataRange(view, currentDate);
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

  const openCreate = useCallback(
    (dateStr?: string) => {
      const d = dateStr ?? toDateStr(new Date());
      if (stackMode) {
        setPast((p) => [...p, currentStack]);
        setCurrentStack({ type: "new", prefillDate: d });
        setFuture([]);
        setNewPanelKey((k) => k + 1);
      } else {
        setPrefillDateModal(d);
        setCreateOpen(true);
      }
    },
    [stackMode, currentStack]
  );

  const openDetail = useCallback(
    (occ: CalendarOccurrence) => {
      if (stackMode) {
        setPast((p) => [...p, currentStack]);
        setCurrentStack({ type: "detail", occurrence: occ });
        setFuture([]);
      } else {
        setDetailOccurrence(occ);
      }
    },
    [stackMode, currentStack]
  );

  const goBack = useCallback(() => {
    if (!stackMode || past.length === 0) return;
    if (
      currentStack.type === "detail" &&
      detailChromeBackRef.current()
    ) {
      return;
    }
    const prev = past[past.length - 1];
    setFuture((f) => [currentStack, ...f]);
    setCurrentStack(prev);
    setPast((p) => p.slice(0, -1));
  }, [stackMode, past, currentStack]);

  const goForward = useCallback(() => {
    if (!stackMode || future.length === 0) return;
    const next = future[0];
    setPast((p) => [...p, currentStack]);
    setCurrentStack(next);
    setFuture((f) => f.slice(1));
  }, [stackMode, future, currentStack]);

  useEffect(() => {
    if (!stackMode || currentStack.type === "detail") return;
    detailChromeBackRef.current = () => false;
  }, [stackMode, currentStack.type]);

  const canBack = stackMode && past.length > 0;
  const canForward = stackMode && future.length > 0;

  const chromeTitle = useMemo(() => {
    if (!stackMode) return null;
    if (currentStack.type === "grid") return null;
    if (currentStack.type === "new") return "New event";
    const t = currentStack.occurrence.event.title.trim();
    if (t.length <= 28) return t;
    return `${t.slice(0, 26)}…`;
  }, [stackMode, currentStack]);

  useEffect(() => {
    if (!studioChrome) return;
    studioChrome.setTitle(chromeTitle);
  }, [studioChrome, chromeTitle]);

  useEffect(() => {
    if (!studioChrome) return;
    studioChrome.setNav({
      canBack,
      canForward,
      goBack,
      goForward,
    });
  }, [studioChrome, canBack, canForward, goBack, goForward]);

  const closeDetailModal = useCallback(() => {
    setDetailOccurrence(null);
  }, []);

  const popStackToGrid = useCallback(() => {
    setFuture([]);
    const { past: p } = stackRef.current;
    if (p.length === 0) {
      setCurrentStack({ type: "grid" });
      return;
    }
    const prev = p[p.length - 1];
    setPast(p.slice(0, -1));
    setCurrentStack(prev);
  }, []);

  async function handleDetailSaveInternal(
    form: EventFormData,
    scope: RecurringEditScope
  ) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const occFromStack = () => {
      const c = stackRef.current.currentStack;
      return c.type === "detail" ? c.occurrence : null;
    };

    const occ: CalendarOccurrence | null = stackMode
      ? occFromStack()
      : detailOccurrence;
    if (!occ) return;

    const payload = detailFormToPayload(form, user.id);
    const masterEvent = resolveCalendarMasterEvent(events, occ);

    const { error } = await applyCalendarOccurrenceSave(supabase, {
      masterEvent,
      occurrence: occ,
      payload,
      scope,
    });

    if (stackMode) {
      popStackToGrid();
    } else {
      setDetailOccurrence(null);
    }
    if (!error) void refetchCalendarData();
  }

  async function handleDetailDelete(scope: RecurringEditScope) {
    const occFromStack = () => {
      const c = stackRef.current.currentStack;
      return c.type === "detail" ? c.occurrence : null;
    };

    const occ: CalendarOccurrence | null = stackMode
      ? occFromStack()
      : detailOccurrence;
    if (!occ) return;
    const supabase = createClient();
    const masterEvent = resolveCalendarMasterEvent(events, occ);

    const { error } = await applyCalendarOccurrenceDelete(supabase, {
      masterEvent,
      occurrence: occ,
      scope,
    });

    if (stackMode) {
      popStackToGrid();
    } else {
      setDetailOccurrence(null);
    }
    if (!error) void refetchCalendarData();
  }

  const onDetailClose = useCallback(() => {
    if (stackMode) {
      goBack();
    } else {
      closeDetailModal();
    }
  }, [stackMode, goBack, closeDetailModal]);

  const showGridResolved = !stackMode || currentStack.type === "grid";

  const rootClass = stackMode
    ? "relative flex h-full min-h-0 flex-1 flex-col"
    : "relative flex h-[calc(100vh-4rem)] flex-col";

  return (
    <div className={rootClass}>
      {showGridResolved ? (
        <>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
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
              <span className="ml-1 text-sm font-semibold text-white">
                {headerLabel}
              </span>
              {loading && !stackMode && (
                <span className="text-xs text-neutral-500">loading…</span>
              )}
            </div>

            <StudioMicroappPrimaryButton
              label="New event"
              onClick={() => openCreate()}
              className="shrink-0"
            />
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {loading && stackMode ? (
              <StudioMicroappSkeletonCalendarGridEmbedded />
            ) : view === "month" ? (
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
          </div>
        </>
      ) : null}

      {stackMode && currentStack.type === "new" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <EventModal
            key={newPanelKey}
            open
            presentation="panel"
            prefillDate={currentStack.prefillDate}
            onSave={async (form) => {
              const supabase = createClient();
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) return;
              await supabase
                .from("calendar_events")
                .insert(formToEventPayload(form, user.id));
              setPast([]);
              setFuture([]);
              setCurrentStack({ type: "grid" });
              void refetchCalendarData();
            }}
            onClose={goBack}
          />
        </div>
      ) : null}

      {stackMode && currentStack.type === "detail" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <EventDetailModal
            open
            presentation="panel"
            chromeBackRef={detailChromeBackRef}
            occurrence={currentStack.occurrence}
            releaseInfo={
              currentStack.occurrence.isReleaseDate
                ? releases.find(
                    (r) => r.id === currentStack.occurrence.masterId
                  ) ?? undefined
                : undefined
            }
            onSave={(form, scope) => void handleDetailSaveInternal(form, scope)}
            onDelete={(scope) => void handleDetailDelete(scope)}
            onClose={onDetailClose}
          />
        </div>
      ) : null}

      {!stackMode ? (
        <>
          <EventModal
            open={createOpen}
            presentation="modal"
            prefillDate={prefillDateModal}
            onSave={async (form) => {
              const supabase = createClient();
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) return;
              await supabase
                .from("calendar_events")
                .insert(formToEventPayload(form, user.id));
              setCreateOpen(false);
              void refetchCalendarData();
            }}
            onClose={() => setCreateOpen(false)}
          />

          <EventDetailModal
            open={!!detailOccurrence}
            presentation="modal"
            occurrence={detailOccurrence}
            releaseInfo={
              detailOccurrence?.isReleaseDate
                ? releases.find((r) => r.id === detailOccurrence.masterId) ??
                  undefined
                : undefined
            }
            onSave={(form, scope) => void handleDetailSaveInternal(form, scope)}
            onDelete={(scope) => void handleDetailDelete(scope)}
            onClose={closeDetailModal}
          />
        </>
      ) : null}
    </div>
  );
}
