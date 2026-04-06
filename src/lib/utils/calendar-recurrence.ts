import type {
  CalendarEvent,
  CalendarOccurrence,
  RecurrenceRule,
} from "@/lib/supabase/types";

// ─── Date helpers ────────────────────────────────────────────────────────────

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  // Parse YYYY-MM-DD as local time (avoids UTC-offset day shift)
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Parse a Supabase ISO timestamp string as LOCAL time, ignoring any UTC
 * offset suffix. This prevents the common UTC→local day shift where
 * "2026-04-11T00:00:00+00:00" (UTC midnight) would become April 10 at 8 pm
 * in UTC-4, making the event render on the wrong day.
 *
 * The contract: whatever date/time was stored in the ISO string is treated
 * as the user's intended local date/time. This is correct for a single-user
 * app where the same person creates and views events.
 */
export function parseStoredDate(iso: string): Date {
  const datePart = iso.slice(0, 10); // "YYYY-MM-DD"
  const [y, m, d] = datePart.split("-").map(Number);
  const timeMatch = iso.match(/T(\d{2}):(\d{2})/);
  if (timeMatch) {
    return new Date(y, m - 1, d, parseInt(timeMatch[1]), parseInt(timeMatch[2]));
  }
  return new Date(y, m - 1, d);
}

/** Local midnight of the given date */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function addYears(d: Date, n: number): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + n);
  return r;
}

/** Sunday of the week containing d */
function weekSunday(d: Date): Date {
  const r = startOfDay(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

/** Days between two local midnights (end - start) */
export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round(
    (startOfDay(b).getTime() - startOfDay(a).getTime()) / msPerDay
  );
}

// ─── Occurrence-date generator ───────────────────────────────────────────────

const MAX_OCCURRENCES = 730; // ~2 years safety cap

/**
 * Yield all occurrence DATES (local midnight) of a recurring event
 * within [rangeStart, rangeEnd] (both inclusive local-day comparisons).
 */
export function generateOccurrenceDates(
  masterStartAt: Date,
  rule: RecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const interval = Math.max(1, rule.interval ?? 1);
  const limitDate = rule.end_date ? parseDate(rule.end_date) : null;
  const limitCount = rule.count ?? Infinity;

  const dates: Date[] = [];
  let count = 0;

  const masterDay = startOfDay(masterStartAt);

  if (rule.frequency === "daily") {
    let cur = masterDay;
    while (count < MAX_OCCURRENCES && count < limitCount) {
      if (limitDate && cur > limitDate) break;
      if (cur > rangeEnd) break;
      if (cur >= rangeStart) dates.push(new Date(cur));
      cur = addDays(cur, interval);
      count++;
    }
    return dates;
  }

  if (rule.frequency === "weekly") {
    const daysOfWeek =
      rule.days_of_week && rule.days_of_week.length > 0
        ? [...rule.days_of_week].sort((a, b) => a - b)
        : [masterDay.getDay()];

    // Anchor to the Sunday of the master's week, then step by interval weeks
    let weekStart = weekSunday(masterDay);

    while (count < MAX_OCCURRENCES) {
      if (weekStart > rangeEnd) break;
      if (limitDate && weekStart > limitDate) break;

      for (const dow of daysOfWeek) {
        if (count >= MAX_OCCURRENCES || count >= limitCount) break;
        const candidate = addDays(weekStart, dow);
        if (candidate < masterDay) continue; // before series start
        if (limitDate && candidate > limitDate) break;
        if (candidate > rangeEnd) break;
        if (candidate >= rangeStart) dates.push(new Date(candidate));
        count++;
      }

      weekStart = addDays(weekStart, interval * 7);
    }
    return dates;
  }

  if (rule.frequency === "monthly") {
    let cur = masterDay;
    while (count < MAX_OCCURRENCES && count < limitCount) {
      if (limitDate && cur > limitDate) break;
      if (cur > rangeEnd) break;
      // Only add if the day-of-month survived month overflow
      // (e.g. Jan 31 + 1 month = Mar 3 on some systems → skip)
      if (cur.getDate() === masterDay.getDate()) {
        if (cur >= rangeStart) dates.push(new Date(cur));
        count++;
      }
      cur = addMonths(cur, interval);
    }
    return dates;
  }

  if (rule.frequency === "yearly") {
    let cur = masterDay;
    while (count < MAX_OCCURRENCES && count < limitCount) {
      if (limitDate && cur > limitDate) break;
      if (cur > rangeEnd) break;
      if (cur >= rangeStart) dates.push(new Date(cur));
      cur = addYears(cur, interval);
      count++;
    }
    return dates;
  }

  return dates;
}

// ─── Full occurrence expansion ────────────────────────────────────────────────

/**
 * Expand a master CalendarEvent and its exceptions into CalendarOccurrences
 * for the given date range.
 */
export function expandRecurringEvent(
  master: CalendarEvent,
  exceptions: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarOccurrence[] {
  if (!master.recurrence) return [];

  const exByDate = new Map<string, CalendarEvent>();
  for (const ex of exceptions) {
    if (ex.recurrence_original_date) {
      exByDate.set(ex.recurrence_original_date, ex);
    }
  }

  const masterStartAt = parseStoredDate(master.start_at);
  const masterEndAt = master.end_at ? parseStoredDate(master.end_at) : null;
  const masterDuration = masterEndAt
    ? daysBetween(masterStartAt, masterEndAt)
    : 0;

  const occDates = generateOccurrenceDates(
    masterStartAt,
    master.recurrence,
    rangeStart,
    rangeEnd
  );

  const results: CalendarOccurrence[] = [];

  for (const occDate of occDates) {
    const dateStr = toDateStr(occDate);
    const exception = exByDate.get(dateStr);

    if (exception?.is_exception_cancelled) continue;

    const event = exception ?? master;

    // Combine occurrence date with master time
    const startAt = exception
      ? parseStoredDate(exception.start_at)
      : new Date(
          occDate.getFullYear(),
          occDate.getMonth(),
          occDate.getDate(),
          masterStartAt.getHours(),
          masterStartAt.getMinutes()
        );

    const endAt = exception
      ? exception.end_at
        ? parseStoredDate(exception.end_at)
        : null
      : masterEndAt
        ? new Date(
            occDate.getFullYear(),
            occDate.getMonth(),
            occDate.getDate() + masterDuration,
            masterEndAt.getHours(),
            masterEndAt.getMinutes()
          )
        : null;

    results.push({
      key: `${master.id}:${dateStr}`,
      masterId: master.id,
      occurrenceDate: dateStr,
      startAt,
      endAt,
      durationDays: endAt ? Math.max(1, daysBetween(startAt, endAt) + 1) : 1,
      event,
      isRecurring: true,
      isCancelled: false,
    });
  }

  return results;
}

/**
 * Convert a non-recurring CalendarEvent to a CalendarOccurrence.
 */
export function singleEventToOccurrence(
  event: CalendarEvent
): CalendarOccurrence {
  const startAt = parseStoredDate(event.start_at);
  const endAt = event.end_at ? parseStoredDate(event.end_at) : null;
  return {
    key: event.id,
    masterId: event.id,
    occurrenceDate: toDateStr(startAt),
    startAt,
    endAt,
    durationDays: endAt ? Math.max(1, daysBetween(startAt, endAt) + 1) : 1,
    event,
    isRecurring: false,
    isCancelled: false,
  };
}

/**
 * Expand all calendar events (masters + exceptions + single events)
 * into a flat list of CalendarOccurrences for [rangeStart, rangeEnd].
 */
export function expandAllEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarOccurrence[] {
  const masters = events.filter(
    (e) => !e.recurrence_parent_id && e.recurrence
  );
  const exceptions = events.filter((e) => !!e.recurrence_parent_id);
  const singles = events.filter(
    (e) => !e.recurrence_parent_id && !e.recurrence
  );

  const excByParent = new Map<string, CalendarEvent[]>();
  for (const ex of exceptions) {
    const pid = ex.recurrence_parent_id!;
    if (!excByParent.has(pid)) excByParent.set(pid, []);
    excByParent.get(pid)!.push(ex);
  }

  const results: CalendarOccurrence[] = [];

  for (const master of masters) {
    const excs = excByParent.get(master.id) ?? [];
    results.push(
      ...expandRecurringEvent(master, excs, rangeStart, rangeEnd)
    );
  }

  for (const single of singles) {
    const startAt = parseStoredDate(single.start_at);
    const endAt = single.end_at ? parseStoredDate(single.end_at) : null;
    const occDate = startOfDay(startAt);

    // Include if the event overlaps with the range at all
    const eventEnd = endAt ? startOfDay(endAt) : occDate;
    if (eventEnd < rangeStart || occDate > rangeEnd) continue;

    results.push(singleEventToOccurrence(single));
  }

  return results;
}

// ─── Month-view layout ────────────────────────────────────────────────────────

export interface EventBar {
  occurrence: CalendarOccurrence;
  /** 0-based column within the week (clamped to 0–6) */
  startCol: number;
  /** 0-based column within the week (clamped to 0–6) */
  endCol: number;
  span: number;
  /** Assigned display track (row within the event zone) */
  track: number;
  /** Event started before this week */
  continuedLeft: boolean;
  /** Event ends after this week */
  continuedRight: boolean;
}

const MAX_VISIBLE_TRACKS = 3;

export interface WeekLayout {
  bars: EventBar[];
  /** Number of hidden events per day index 0–6 */
  overflowByDay: number[];
}

/**
 * Lay out CalendarOccurrences for a single 7-day week row in the month view.
 * weeks[0] = Sunday.
 */
export function layoutWeek(
  weekDays: Date[],
  occurrences: CalendarOccurrence[]
): WeekLayout {
  const weekStart = startOfDay(weekDays[0]);
  const weekEnd = startOfDay(weekDays[6]);

  // Gather events that overlap this week
  type RawBar = Omit<EventBar, "track">;

  const rawBars: RawBar[] = [];
  for (const occ of occurrences) {
    const evStart = startOfDay(occ.startAt);
    const evEnd = occ.endAt ? startOfDay(occ.endAt) : evStart;
    if (evEnd < weekStart || evStart > weekEnd) continue;

    const clampedStart = evStart < weekStart ? weekStart : evStart;
    const clampedEnd = evEnd > weekEnd ? weekEnd : evEnd;

    rawBars.push({
      occurrence: occ,
      startCol: daysBetween(weekStart, clampedStart),
      endCol: daysBetween(weekStart, clampedEnd),
      span: daysBetween(clampedStart, clampedEnd) + 1,
      continuedLeft: evStart < weekStart,
      continuedRight: evEnd > weekEnd,
    });
  }

  // Sort: longer spans first, then by start column, then by title
  rawBars.sort((a, b) => {
    if (b.span !== a.span) return b.span - a.span;
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    return a.occurrence.event.title.localeCompare(b.occurrence.event.title);
  });

  // Assign tracks (greedy)
  const trackOccupancy: Array<Array<[number, number]>> = [];
  const bars: EventBar[] = rawBars.map((raw) => {
    let assignedTrack = -1;
    for (let t = 0; t < trackOccupancy.length; t++) {
      const noOverlap = trackOccupancy[t].every(
        ([s, e]) => raw.endCol < s || raw.startCol > e
      );
      if (noOverlap) {
        assignedTrack = t;
        trackOccupancy[t].push([raw.startCol, raw.endCol]);
        break;
      }
    }
    if (assignedTrack === -1) {
      assignedTrack = trackOccupancy.length;
      trackOccupancy.push([[raw.startCol, raw.endCol]]);
    }
    return { ...raw, track: assignedTrack };
  });

  // Count overflow per day
  const overflowByDay = Array(7).fill(0);
  for (const bar of bars) {
    if (bar.track >= MAX_VISIBLE_TRACKS) {
      for (let c = bar.startCol; c <= bar.endCol; c++) {
        overflowByDay[c]++;
      }
    }
  }

  return { bars: bars.filter((b) => b.track < MAX_VISIBLE_TRACKS), overflowByDay };
}

// ─── Week-view layout ─────────────────────────────────────────────────────────

export interface WeekViewEventSlot {
  occurrence: CalendarOccurrence;
  /** 0-based column within its day (for overlapping events) */
  col: number;
  totalCols: number;
  /** Pixels from top of the time grid */
  topPx: number;
  /** Height in pixels */
  heightPx: number;
}

/** Height of one hour in the week-view time grid (px) */
export const HOUR_HEIGHT_PX = 64;

function minutesFromDayStart(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Lay out timed events for one day column in the week view.
 * Returns slots with column assignment for overlap handling.
 */
export function layoutDayEvents(
  occurrences: CalendarOccurrence[]
): WeekViewEventSlot[] {
  const sorted = [...occurrences].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime()
  );

  // Greedy column assignment
  const columns: Date[] = []; // stores the end time of last event in each column
  const slots: Array<{ occurrence: CalendarOccurrence; col: number }> = [];

  for (const occ of sorted) {
    const endAt = occ.endAt ?? new Date(occ.startAt.getTime() + 30 * 60000);
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      if (occ.startAt >= columns[c]) {
        columns[c] = endAt;
        slots.push({ occurrence: occ, col: c });
        placed = true;
        break;
      }
    }
    if (!placed) {
      slots.push({ occurrence: occ, col: columns.length });
      columns.push(endAt);
    }
  }

  const totalCols = columns.length || 1;

  return slots.map(({ occurrence, col }) => {
    const endAt =
      occurrence.endAt ?? new Date(occurrence.startAt.getTime() + 30 * 60000);
    const startMin = minutesFromDayStart(occurrence.startAt);
    const endMin = minutesFromDayStart(endAt);
    const durationMin = Math.max(30, endMin > startMin ? endMin - startMin : 30);

    return {
      occurrence,
      col,
      totalCols,
      topPx: (startMin / 60) * HOUR_HEIGHT_PX,
      heightPx: (durationMin / 60) * HOUR_HEIGHT_PX,
    };
  });
}
