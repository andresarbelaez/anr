import { describe, expect, it } from "vitest";
import type { CalendarEvent, CalendarOccurrence } from "@/lib/supabase/types";
import {
  prevCalendarDayStr,
  resolveCalendarMasterEvent,
} from "@/lib/calendar/calendar-event-mutations";

function masterEvent(partial: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "m1",
    user_id: "u1",
    title: "Series",
    description: null,
    start_at: "2026-04-01T09:00:00",
    end_at: null,
    all_day: false,
    color: "blue",
    location: null,
    link: null,
    recurrence: { frequency: "weekly", interval: 1, days_of_week: [3] },
    recurrence_parent_id: null,
    recurrence_original_date: null,
    is_exception_cancelled: false,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("calendar-event-mutations", () => {
  it("prevCalendarDayStr steps back one local day", () => {
    expect(prevCalendarDayStr("2026-04-06")).toBe("2026-04-05");
    expect(prevCalendarDayStr("2026-01-01")).toBe("2025-12-31");
  });

  it("resolveCalendarMasterEvent returns master from events when occurrence is exception row", () => {
    const master = masterEvent({ id: "master-id" });
    const exc = masterEvent({
      id: "ex1",
      recurrence_parent_id: "master-id",
      recurrence_original_date: "2026-04-08",
      recurrence: null,
    });
    const occ: CalendarOccurrence = {
      key: "k",
      masterId: "master-id",
      occurrenceDate: "2026-04-08",
      startAt: new Date(2026, 3, 8, 9, 0),
      endAt: null,
      durationDays: 1,
      event: exc,
      isRecurring: true,
      isCancelled: false,
    };
    const resolved = resolveCalendarMasterEvent([master, exc], occ);
    expect(resolved.id).toBe("master-id");
  });

  it("resolveCalendarMasterEvent returns occurrence event when it is already the master", () => {
    const master = masterEvent();
    const occ: CalendarOccurrence = {
      key: "k",
      masterId: master.id,
      occurrenceDate: "2026-04-01",
      startAt: new Date(2026, 3, 1, 9, 0),
      endAt: null,
      durationDays: 1,
      event: master,
      isRecurring: true,
      isCancelled: false,
    };
    expect(resolveCalendarMasterEvent([master], occ).id).toBe(master.id);
  });
});
