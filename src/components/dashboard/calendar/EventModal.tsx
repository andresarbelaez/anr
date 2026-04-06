"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, MapPin, Link2, Repeat2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { ALL_COLOR_KEYS, CALENDAR_COLORS } from "@/lib/utils/calendar-colors";
import type { CalendarColorKey, CalendarEvent, RecurrenceRule } from "@/lib/supabase/types";
import { toDateStr } from "@/lib/utils/calendar-recurrence";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const FREQ_LABELS: Record<string, string> = {
  daily: "day(s)",
  weekly: "week(s)",
  monthly: "month(s)",
  yearly: "year(s)",
};

// ─── Date-format preference ───────────────────────────────────────────────────

export type DateFmt = "MDY" | "DMY";
const LS_KEY = "cal_date_fmt";

function readStoredFmt(): DateFmt {
  if (typeof window === "undefined") return "MDY";
  return (localStorage.getItem(LS_KEY) as DateFmt) ?? "MDY";
}

// ─── Split date input ─────────────────────────────────────────────────────────

/**
 * Three-field date input (month/day/year OR day/month/year) whose internal
 * value is always an ISO YYYY-MM-DD string.
 */
function SplitDateInput({
  value,
  onChange,
  fmt,
}: {
  value: string; // YYYY-MM-DD or ""
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
  const sep = <span className="text-neutral-600 select-none">/</span>;

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

// ─── Form data types ──────────────────────────────────────────────────────────

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

function defaultForm(prefillDate?: string): EventFormData {
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

function eventToForm(event: CalendarEvent): EventFormData {
  const startAt = new Date(event.start_at);
  const endAt = event.end_at ? new Date(event.end_at) : startAt;
  const padTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const rule = event.recurrence;
  return {
    title: event.title,
    startDate: toDateStr(startAt),
    startTime: padTime(startAt),
    endDate: toDateStr(endAt),
    endTime: padTime(endAt),
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
          daysOfWeek: rule.days_of_week ?? [startAt.getDay()],
          endType: rule.end_date ? "date" : rule.count ? "count" : "never",
          endDate: rule.end_date ?? "",
          endCount: rule.count ?? 10,
        }
      : {
          enabled: false,
          frequency: "weekly",
          interval: 1,
          daysOfWeek: [startAt.getDay()],
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

// ─── Modal component ──────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  prefillDate?: string;
  onSave: (form: EventFormData) => void;
  onClose: () => void;
}

export function EventModal({ open, prefillDate, onSave, onClose }: Props) {
  const [form, setForm] = useState<EventFormData>(defaultForm(prefillDate));
  const [fmt, setFmt] = useState<DateFmt>("MDY");
  const fmtInitialised = useRef(false);

  useEffect(() => {
    if (!fmtInitialised.current) {
      setFmt(readStoredFmt());
      fmtInitialised.current = true;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setForm(defaultForm(prefillDate));
  }, [open, prefillDate]);

  if (!open) return null;

  const toggleFmt = () => {
    const next: DateFmt = fmt === "MDY" ? "DMY" : "MDY";
    setFmt(next);
    localStorage.setItem(LS_KEY, next);
  };

  const set = <K extends keyof EventFormData>(k: K, v: EventFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setRec = <K extends keyof EventFormData["recurrence"]>(
    k: K,
    v: EventFormData["recurrence"][K]
  ) => setForm((f) => ({ ...f, recurrence: { ...f.recurrence, [k]: v } }));

  const toggleDay = (d: number) => {
    const days = form.recurrence.daysOfWeek.includes(d)
      ? form.recurrence.daysOfWeek.filter((x) => x !== d)
      : [...form.recurrence.daysOfWeek, d];
    setRec("daysOfWeek", days.length ? days : [d]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 pt-16 pb-8">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">New event</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* Title */}
          <input
            autoFocus
            type="text"
            placeholder="Event title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-accent"
          />

          {/* All-day toggle */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => set("allDay", e.target.checked)}
              className="accent-accent"
            />
            All day
          </label>

          {/* Date format toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Date format</span>
            <div className="flex items-center rounded-md border border-neutral-700 text-xs">
              {(["MDY", "DMY"] as const).map((f) => (
                <button
                  key={f}
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

          {/* Date / Time */}
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

          {/* Description */}
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-accent"
          />

          {/* Color */}
          <div className="space-y-2">
            <p className="text-xs text-neutral-500">Color</p>
            <div className="flex gap-2">
              {ALL_COLOR_KEYS.map((key) => (
                <button
                  key={key}
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

          {/* Location */}
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

          {/* Link */}
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

          {/* Recurrence */}
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
                {/* Frequency */}
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
                    {(["daily", "weekly", "monthly", "yearly"] as const).map((f) => (
                      <option key={f} value={f}>
                        {FREQ_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Days of week */}
                {form.recurrence.frequency === "weekly" && (
                  <div className="flex gap-1">
                    {DAYS.map((d, i) => (
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

                {/* End condition */}
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
                        onChange={(e) => setRec("endCount", Number(e.target.value))}
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

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-neutral-800 px-5 py-4 gap-2">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!form.title.trim()}
              onClick={() => {
                if (!form.title.trim()) return;
                onSave(form);
              }}
            >
              Create
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
