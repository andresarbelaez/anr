import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CalendarColorKey,
  CalendarEvent,
  CalendarOccurrence,
  RecurringEditScope,
  RecurrenceRule,
} from "@/lib/supabase/types";
import {
  addDays,
  parseDate,
  parseStoredDate,
  toDateStr,
} from "@/lib/utils/calendar-recurrence";

export type CalendarEventUpsertPayload = Omit<
  CalendarEvent,
  | "id"
  | "created_at"
  | "updated_at"
  | "recurrence_parent_id"
  | "recurrence_original_date"
  | "is_exception_cancelled"
>;

/** Previous calendar day as YYYY-MM-DD (local date math; avoids UTC `toISOString` shifts). */
export function prevCalendarDayStr(dateStr: string): string {
  return toDateStr(addDays(parseDate(dateStr), -1));
}

export function resolveCalendarMasterEvent(
  events: CalendarEvent[],
  occ: CalendarOccurrence
): CalendarEvent {
  return occ.event.recurrence_parent_id
    ? events.find((e) => e.id === occ.masterId) ?? occ.event
    : occ.event;
}

function masterStartDateStr(master: CalendarEvent): string {
  return master.start_at.slice(0, 10);
}

/**
 * Synthetic occurrence for agent calendar mutations (master row + target date).
 */
export function agentCalendarOccurrenceStub(
  master: CalendarEvent,
  occurrenceDate: string,
  startAtOverride?: string
): CalendarOccurrence {
  const startIso = startAtOverride ?? master.start_at;
  const startAt = parseStoredDate(startIso);
  return {
    key: `${master.id}:${occurrenceDate}`,
    masterId: master.id,
    occurrenceDate,
    startAt,
    endAt: null,
    durationDays: 1,
    event: master,
    isRecurring: !!master.recurrence,
    isCancelled: false,
  };
}

/** Merge agent patch fields onto the loaded master row for scoped updates. */
export function mergeCalendarPatchOntoMaster(
  master: CalendarEvent,
  patch: Record<string, unknown>,
  userId: string
): CalendarEventUpsertPayload {
  return {
    user_id: userId,
    title: (patch.title !== undefined ? patch.title : master.title) as string,
    description:
      patch.description !== undefined
        ? (patch.description as string | null)
        : master.description,
    start_at: (patch.start_at !== undefined
      ? patch.start_at
      : master.start_at) as string,
    end_at:
      patch.end_at !== undefined
        ? (patch.end_at as string | null)
        : master.end_at,
    all_day: (patch.all_day !== undefined ? patch.all_day : master.all_day) as boolean,
    color: (patch.color !== undefined ? patch.color : master.color) as CalendarColorKey,
    location:
      patch.location !== undefined
        ? (patch.location as string | null)
        : master.location,
    link:
      patch.link !== undefined ? (patch.link as string | null) : master.link,
    recurrence:
      patch.recurrence !== undefined
        ? (patch.recurrence as RecurrenceRule | null)
        : master.recurrence,
  };
}

export async function applyCalendarOccurrenceSave(
  supabase: SupabaseClient,
  {
    masterEvent,
    occurrence,
    payload,
    scope,
  }: {
    masterEvent: CalendarEvent;
    occurrence: CalendarOccurrence;
    payload: CalendarEventUpsertPayload;
    scope: RecurringEditScope;
  }
): Promise<{ error: { message: string } | null }> {
  const occ = occurrence;
  const effectiveScope: RecurringEditScope = occ.isRecurring ? scope : "all";

  if (effectiveScope === "all") {
    const { error } = await supabase
      .from("calendar_events")
      .update(payload)
      .eq("id", masterEvent.id);
    return { error: error ? { message: error.message } : null };
  }

  if (effectiveScope === "this") {
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("recurrence_parent_id", occ.masterId)
      .eq("recurrence_original_date", occ.occurrenceDate)
      .maybeSingle();

    const exceptionPayload = {
      ...payload,
      recurrence: null,
      recurrence_parent_id: occ.masterId,
      recurrence_original_date: occ.occurrenceDate,
      is_exception_cancelled: false,
    };

    if (existing?.id) {
      const { error } = await supabase
        .from("calendar_events")
        .update(exceptionPayload)
        .eq("id", existing.id as string);
      return { error: error ? { message: error.message } : null };
    }

    const { error } = await supabase
      .from("calendar_events")
      .insert(exceptionPayload);
    return { error: error ? { message: error.message } : null };
  }

  const newEndDate = prevCalendarDayStr(occ.occurrenceDate);
  const updatedRecurrence = masterEvent.recurrence
    ? { ...masterEvent.recurrence, end_date: newEndDate }
    : null;

  if (
    masterEvent.recurrence &&
    occ.occurrenceDate === masterStartDateStr(masterEvent)
  ) {
    const { error } = await supabase
      .from("calendar_events")
      .update(payload)
      .eq("id", masterEvent.id);
    return { error: error ? { message: error.message } : null };
  }

  const { error: e1 } = await supabase
    .from("calendar_events")
    .update({ recurrence: updatedRecurrence })
    .eq("id", masterEvent.id);
  if (e1) return { error: { message: e1.message } };

  const { error: e2 } = await supabase.from("calendar_events").insert({
    ...payload,
    start_at: occ.startAt.toISOString(),
  });
  return { error: e2 ? { message: e2.message } : null };
}

export async function applyCalendarOccurrenceDelete(
  supabase: SupabaseClient,
  {
    masterEvent,
    occurrence,
    scope,
  }: {
    masterEvent: CalendarEvent;
    occurrence: CalendarOccurrence;
    scope: RecurringEditScope;
  }
): Promise<{ error: { message: string } | null }> {
  const occ = occurrence;
  const effectiveScope: RecurringEditScope = occ.isRecurring ? scope : "all";

  if (!occ.isRecurring || effectiveScope === "all") {
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", masterEvent.id);
    return { error: error ? { message: error.message } : null };
  }

  if (effectiveScope === "this") {
    const { error } = await supabase.from("calendar_events").insert({
      user_id: masterEvent.user_id,
      title: masterEvent.title,
      start_at: occ.startAt.toISOString(),
      all_day: masterEvent.all_day,
      color: masterEvent.color,
      recurrence_parent_id: occ.masterId,
      recurrence_original_date: occ.occurrenceDate,
      is_exception_cancelled: true,
    });
    return { error: error ? { message: error.message } : null };
  }

  const newEndDate = prevCalendarDayStr(occ.occurrenceDate);
  if (occ.occurrenceDate === masterStartDateStr(masterEvent)) {
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", masterEvent.id);
    return { error: error ? { message: error.message } : null };
  }

  const updatedRecurrence = masterEvent.recurrence
    ? { ...masterEvent.recurrence, end_date: newEndDate }
    : null;
  const { error } = await supabase
    .from("calendar_events")
    .update({ recurrence: updatedRecurrence })
    .eq("id", masterEvent.id);
  return { error: error ? { message: error.message } : null };
}
