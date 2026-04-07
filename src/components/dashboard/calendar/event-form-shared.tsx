"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link2, MapPin, Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ALL_COLOR_KEYS, CALENDAR_COLORS } from "@/lib/utils/calendar-colors";
import { toDateStr } from "@/lib/utils/calendar-recurrence";
import type {
  CalendarColorKey,
  CalendarEvent,
  RecurrenceRule,
} from "@/lib/supabase/types";

export const CAL_DATE_FMT_LS_KEY = "cal_date_fmt";

export type DateFmt = "MDY" | "DMY";

export function readStoredFmt(): DateFmt {
  if (typeof window === "undefined") return "MDY";
  return (localStorage.getItem(CAL_DATE_FMT_LS_KEY) as DateFmt) ?? "MDY";
}

export function useCalendarDateFmt(): {
  fmt: DateFmt;
  toggleFmt: () => void;
} {
  const [fmt, setFmt] = useState<DateFmt>("MDY");
  const initialised = useRef(false);

  useEffect(() => {
    if (!initialised.current) {
      setFmt(readStoredFmt());
      initialised.current = true;
    }
  }, []);

  const toggleFmt = useCallback(() => {
    setFmt((prev) => {
      const next: DateFmt = prev === "MDY" ? "DMY" : "MDY";
      localStorage.setItem(CAL_DATE_FMT_LS_KEY, next);
      return next;
    });
  }, []);

  return { fmt, toggleFmt };
}

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const FREQ_LABELS: Record<string, string> = {
  daily: "day(s)",
  weekly: "week(s)",
  monthly: "month(s)",
  yearly: "year(s)",
};

export function SplitDateInput({
  value,
  onChange,
  fmt,
}: {
  value: string;
  onChange: (v: string) => void;
  fmt: DateFmt;
}) {
  const parts = value ? value.split("-") : ["", "", ""];
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  const emit = useCallback(
    (y: string, m: string, d: string) => {
      const yn = parseInt(y);
      const mn = parseInt(m);
      const dn = parseInt(d);
      if (yn > 999 && mn >= 1 && mn <= 12 && dn >= 1 && dn <= 31) {
        onChange(
          `${yn}-${String(mn).padStart(2, "0")}-${String(dn).padStart(2, "0")}`
        );
      }
    },
    [onChange]
  );

  const inputCls =
    "w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-center text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent";

  const monthField = (
    <input
      type="number"
      min={1}
      max={12}
      placeholder="MM"
      value={month}
      onChange={(e) => emit(year, e.target.value, day)}
      className={cn(inputCls, "w-14")}
    />
  );
  const dayField = (
    <input
      type="number"
      min={1}
      max={31}
      placeholder="DD"
      value={day}
      onChange={(e) => emit(year, month, e.target.value)}
      className={cn(inputCls, "w-14")}
    />
  );
  const yearField = (
    <input
      type="number"
      min={2000}
      max={2100}
      placeholder="YYYY"
      value={year}
      onChange={(e) => emit(e.target.value, month, day)}
      className={cn(inputCls, "w-20")}
    />
  );
  const sep = <span className="select-none text-neutral-600">/</span>;
  const fields =
    fmt === "MDY"
      ? [monthField, sep, dayField, sep, yearField]
      : [dayField, sep, monthField, sep, yearField];

  return (
    <div className="flex items-center gap-1">
      {fields.map((f, i) => (
        <span key={i}>{f}</span>
      ))}
    </div>
  );
}

export interface EventFormData {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  description: string;
  color: CalendarColorKey;
  location: string;
  link: string;
  recurrence: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    daysOfWeek: number[];
    endType: "never" | "date" | "count";
    endDate: string;
    endCount: number;
  };
}

export function defaultForm(prefillDate?: string): EventFormData {
  const date = prefillDate ?? toDateStr(new Date());
  return {
    title: "",
    startDate: date,
    startTime: "09:00",
    endDate: date,
    endTime: "10:00",
    allDay: false,
    description: "",
    color: "default",
    location: "",
    link: "",
    recurrence: {
      enabled: false,
      frequency: "weekly",
      interval: 1,
      daysOfWeek: [new Date().getDay()],
      endType: "never",
      endDate: "",
      endCount: 10,
    },
  };
}

export function isoDatePart(iso: string): string {
  return iso.slice(0, 10);
}

export function isoTimePart(iso: string): string {
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "00:00";
}

/** Local weekday from stored ISO date part (avoids UTC day shift). */
function weekdayFromIsoDate(iso: string): number {
  const [y, m, d] = isoDatePart(iso).split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function eventToForm(event: CalendarEvent): EventFormData {
  const rule = event.recurrence;
  const dowFallback = weekdayFromIsoDate(event.start_at);
  return {
    title: event.title,
    startDate: isoDatePart(event.start_at),
    startTime: isoTimePart(event.start_at),
    endDate: event.end_at
      ? isoDatePart(event.end_at)
      : isoDatePart(event.start_at),
    endTime: event.end_at
      ? isoTimePart(event.end_at)
      : isoTimePart(event.start_at),
    allDay: event.all_day,
    description: event.description ?? "",
    color: event.color,
    location: event.location ?? "",
    link: event.link ?? "",
    recurrence: rule
      ? {
          enabled: true,
          frequency: rule.frequency,
          interval: rule.interval ?? 1,
          daysOfWeek: rule.days_of_week ?? [dowFallback],
          endType: rule.end_date ? "date" : rule.count ? "count" : "never",
          endDate: rule.end_date ?? "",
          endCount: rule.count ?? 10,
        }
      : {
          enabled: false,
          frequency: "weekly",
          interval: 1,
          daysOfWeek: [dowFallback],
          endType: "never",
          endDate: "",
          endCount: 10,
        },
  };
}

export function formToEventPayload(
  form: EventFormData,
  userId: string
): Omit<
  CalendarEvent,
  | "id"
  | "created_at"
  | "updated_at"
  | "recurrence_parent_id"
  | "recurrence_original_date"
  | "is_exception_cancelled"
> {
  const start = form.allDay
    ? `${form.startDate}T00:00:00`
    : `${form.startDate}T${form.startTime}:00`;
  const end = form.allDay
    ? `${form.endDate}T23:59:59`
    : `${form.endDate}T${form.endTime}:00`;

  let recurrence: RecurrenceRule | null = null;
  if (form.recurrence.enabled) {
    recurrence = {
      frequency: form.recurrence.frequency,
      interval: Math.max(1, form.recurrence.interval),
      ...(form.recurrence.frequency === "weekly" && {
        days_of_week: form.recurrence.daysOfWeek.length
          ? form.recurrence.daysOfWeek
          : [new Date(start).getDay()],
      }),
      ...(form.recurrence.endType === "date" && form.recurrence.endDate
        ? { end_date: form.recurrence.endDate }
        : {}),
      ...(form.recurrence.endType === "count"
        ? { count: Math.max(1, form.recurrence.endCount) }
        : {}),
    };
  }

  return {
    user_id: userId,
    title: form.title.trim(),
    description: form.description.trim() || null,
    start_at: start,
    end_at: end !== start ? end : null,
    all_day: form.allDay,
    color: form.color,
    location: form.location.trim() || null,
    link: form.link.trim() || null,
    recurrence,
  };
}

interface EventFormFieldsProps {
  form: EventFormData;
  set: <K extends keyof EventFormData>(k: K, v: EventFormData[K]) => void;
  setRec: <K extends keyof EventFormData["recurrence"]>(
    k: K,
    v: EventFormData["recurrence"][K]
  ) => void;
  fmt: DateFmt;
  toggleFmt: () => void;
  toggleDay: (d: number) => void;
}

export function EventFormDateFmtToggle({
  fmt,
  toggleFmt,
}: {
  fmt: DateFmt;
  toggleFmt: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-neutral-500">Date format</span>
      <div className="flex items-center rounded-md border border-neutral-700 text-xs">
        {(["MDY", "DMY"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={toggleFmt}
            className={cn(
              "px-2 py-0.5 transition first:rounded-l-md last:rounded-r-md",
              fmt === f
                ? "bg-neutral-700 text-white"
                : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            {f === "MDY" ? "MM/DD" : "DD/MM"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EventFormFields({
  form,
  set,
  setRec,
  fmt,
  toggleFmt,
  toggleDay,
}: EventFormFieldsProps) {
  return (
    <div className="space-y-5 px-5 py-5">
      <input
        autoFocus
        type="text"
        placeholder="Event title"
        value={form.title}
        onChange={(e) => set("title", e.target.value)}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-accent"
      />

      <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={form.allDay}
          onChange={(e) => set("allDay", e.target.checked)}
          className="accent-accent"
        />
        All day
      </label>

      <EventFormDateFmtToggle fmt={fmt} toggleFmt={toggleFmt} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500">Start</label>
          <SplitDateInput
            value={form.startDate}
            onChange={(v) => set("startDate", v)}
            fmt={fmt}
          />
          {!form.allDay && (
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => set("startTime", e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
            />
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500">End</label>
          <SplitDateInput
            value={form.endDate}
            onChange={(v) => set("endDate", v)}
            fmt={fmt}
          />
          {!form.allDay && (
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => set("endTime", e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
            />
          )}
        </div>
      </div>

      <textarea
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
        rows={2}
        className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-accent"
      />

      <div className="space-y-2">
        <p className="text-xs text-neutral-500">Color</p>
        <div className="flex gap-2">
          {ALL_COLOR_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              title={CALENDAR_COLORS[key].label}
              onClick={() => set("color", key)}
              className={cn(
                "h-6 w-6 rounded-full transition",
                CALENDAR_COLORS[key].dot,
                form.color === key
                  ? "ring-2 ring-white ring-offset-1 ring-offset-neutral-950"
                  : "opacity-60 hover:opacity-100"
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-neutral-500" />
        <input
          type="text"
          placeholder="Location (optional)"
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 shrink-0 text-neutral-500" />
        <input
          type="url"
          placeholder="Meeting link (optional)"
          value={form.link}
          onChange={(e) => set("link", e.target.value)}
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
          <Repeat2 className="h-4 w-4 text-neutral-500" />
          <input
            type="checkbox"
            checked={form.recurrence.enabled}
            onChange={(e) => setRec("enabled", e.target.checked)}
            className="accent-accent"
          />
          Repeat
        </label>

        {form.recurrence.enabled && (
          <div className="space-y-3 pl-6">
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <span>Every</span>
              <input
                type="number"
                min={1}
                max={99}
                value={form.recurrence.interval}
                onChange={(e) => setRec("interval", Number(e.target.value))}
                className="w-14 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <select
                value={form.recurrence.frequency}
                onChange={(e) =>
                  setRec(
                    "frequency",
                    e.target.value as EventFormData["recurrence"]["frequency"]
                  )
                }
                className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {(["daily", "weekly", "monthly", "yearly"] as const).map(
                  (freq) => (
                    <option key={freq} value={freq}>
                      {FREQ_LABELS[freq]}
                    </option>
                  )
                )}
              </select>
            </div>

            {form.recurrence.frequency === "weekly" && (
              <div className="flex gap-1">
                {DAYS_SHORT.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "h-7 w-7 rounded-full text-xs font-medium transition",
                      form.recurrence.daysOfWeek.includes(i)
                        ? "bg-accent text-black"
                        : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-300">
              <span>Ends</span>
              <select
                value={form.recurrence.endType}
                onChange={(e) =>
                  setRec(
                    "endType",
                    e.target.value as EventFormData["recurrence"]["endType"]
                  )
                }
                className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="never">Never</option>
                <option value="date">On date</option>
                <option value="count">After</option>
              </select>
              {form.recurrence.endType === "date" && (
                <SplitDateInput
                  value={form.recurrence.endDate}
                  onChange={(v) => setRec("endDate", v)}
                  fmt={fmt}
                />
              )}
              {form.recurrence.endType === "count" && (
                <>
                  <input
                    type="number"
                    min={1}
                    value={form.recurrence.endCount}
                    onChange={(e) =>
                      setRec("endCount", Number(e.target.value))
                    }
                    className="w-16 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <span>occurrences</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
