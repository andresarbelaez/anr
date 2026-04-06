"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Disc3,
  ExternalLink,
  Info,
  Link2,
  MapPin,
  Pencil,
  Repeat2,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  ALL_COLOR_KEYS,
  CALENDAR_COLORS,
  getEventColor,
  RELEASE_EVENT_STYLE,
} from "@/lib/utils/calendar-colors";
import { toDateStr } from "@/lib/utils/calendar-recurrence";
import type {
  CalendarColorKey,
  CalendarEvent,
  CalendarOccurrence,
  RecurrenceRule,
  ReleaseStatus,
} from "@/lib/supabase/types";
import type { RecurringEditScope } from "./RecurringEditDialog";

// ─── Shared date-format types (mirrors EventModal) ─────────────────────────────

type DateFmt = "MDY" | "DMY";
const LS_KEY = "cal_date_fmt";

function readStoredFmt(): DateFmt {
  if (typeof window === "undefined") return "MDY";
  return (localStorage.getItem(LS_KEY) as DateFmt) ?? "MDY";
}

// ─── SplitDateInput ────────────────────────────────────────────────────────────

function SplitDateInput({
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
      type="number" min={1} max={12} placeholder="MM" value={month}
      onChange={(e) => emit(year, e.target.value, day)}
      className={cn(inputCls, "w-14")}
    />
  );
  const dayField = (
    <input
      type="number" min={1} max={31} placeholder="DD" value={day}
      onChange={(e) => emit(year, month, e.target.value)}
      className={cn(inputCls, "w-14")}
    />
  );
  const yearField = (
    <input
      type="number" min={2000} max={2100} placeholder="YYYY" value={year}
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
      {fields.map((f, i) => <span key={i}>{f}</span>)}
    </div>
  );
}

// ─── Form data ─────────────────────────────────────────────────────────────────

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

/**
 * Extract YYYY-MM-DD from a Supabase ISO timestamp string without going
 * through new Date(), so UTC-midnight timestamps never shift to the previous
 * day in negative-offset timezones (e.g. UTC-4: "2026-04-11T00:00:00+00:00"
 * → local April 10 via getDate(), but .slice(0,10) always gives "2026-04-11").
 */
function isoDatePart(iso: string): string {
  return iso.slice(0, 10); // "YYYY-MM-DD"
}

function isoTimePart(iso: string): string {
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "00:00";
}

function eventToForm(event: CalendarEvent): EventFormData {
  const rule = event.recurrence;
  return {
    title: event.title,
    startDate: isoDatePart(event.start_at),
    startTime: isoTimePart(event.start_at),
    endDate: event.end_at ? isoDatePart(event.end_at) : isoDatePart(event.start_at),
    endTime: event.end_at ? isoTimePart(event.end_at) : isoTimePart(event.start_at),
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
          daysOfWeek: rule.days_of_week ?? [new Date(event.start_at).getDay()],
          endType: rule.end_date ? "date" : rule.count ? "count" : "never",
          endDate: rule.end_date ?? "",
          endCount: rule.count ?? 10,
        }
      : {
          enabled: false,
          frequency: "weekly",
          interval: 1,
          daysOfWeek: [new Date(event.start_at).getDay()],
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
  | "id" | "created_at" | "updated_at"
  | "recurrence_parent_id" | "recurrence_original_date"
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
        ? { end_date: form.recurrence.endDate } : {}),
      ...(form.recurrence.endType === "count"
        ? { count: Math.max(1, form.recurrence.endCount) } : {}),
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

// ─── Display helpers ───────────────────────────────────────────────────────────

function fmtOccurrenceDate(occ: CalendarOccurrence): string {
  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

  if (occ.event.all_day) {
    // Parse the occurrence date as local midnight to avoid UTC offset shifting the day
    const [y, m, d] = occ.occurrenceDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", dateOpts);
  }

  // For timed events, reconstruct from the stored ISO string parts (not UTC conversion)
  // so the displayed date matches what was entered, regardless of viewer timezone.
  const [y, m, d] = isoDatePart(occ.event.start_at).split("-").map(Number);
  const [startH, startMin] = isoTimePart(occ.event.start_at).split(":").map(Number);
  const startLocal = new Date(y, m - 1, d, startH, startMin);
  const datePart = startLocal.toLocaleDateString("en-US", dateOpts);
  const startTime = startLocal.toLocaleTimeString("en-US", timeOpts);

  if (!occ.endAt) return `${datePart} at ${startTime}`;

  const [ey, em, ed] = (occ.event.end_at ? isoDatePart(occ.event.end_at) : isoDatePart(occ.event.start_at)).split("-").map(Number);
  const [endH, endMin] = (occ.event.end_at ? isoTimePart(occ.event.end_at) : isoTimePart(occ.event.start_at)).split(":").map(Number);
  const endLocal = new Date(ey, em - 1, ed, endH, endMin);
  const endTime = endLocal.toLocaleTimeString("en-US", timeOpts);

  return `${datePart}, ${startTime} – ${endTime}`;
}

function recurrenceSummary(rule: RecurrenceRule): string {
  const n = rule.interval ?? 1;
  if (rule.frequency === "daily")
    return n === 1 ? "Every day" : `Every ${n} days`;
  if (rule.frequency === "weekly") {
    const names = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const days = rule.days_of_week?.length
      ? [...rule.days_of_week].sort((a,b)=>a-b).map(d => names[d]).join(", ")
      : null;
    if (n === 1) return days ? `Every ${days}` : "Every week";
    return days ? `Every ${n} weeks on ${days}` : `Every ${n} weeks`;
  }
  if (rule.frequency === "monthly")
    return n === 1 ? "Every month" : `Every ${n} months`;
  if (rule.frequency === "yearly")
    return n === 1 ? "Every year" : `Every ${n} years`;
  return "";
}

// ─── Modal states ──────────────────────────────────────────────────────────────

type ModalState = "view" | "scope" | "edit";
type ScopeTarget = "edit" | "delete";

const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const FREQ_LABELS: Record<string, string> = {
  daily: "day(s)", weekly: "week(s)", monthly: "month(s)", yearly: "year(s)",
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ReleaseInfo {
  id: string;
  status: ReleaseStatus;
}

interface Props {
  open: boolean;
  occurrence: CalendarOccurrence | null;
  releaseInfo?: ReleaseInfo;
  onSave: (form: EventFormData, scope: RecurringEditScope) => void;
  onDelete: (scope: RecurringEditScope) => void;
  onClose: () => void;
}

// ─── Main component ────────────────────────────────────────────────────────────

export function EventDetailModal({
  open,
  occurrence,
  releaseInfo,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [state, setState] = useState<ModalState>("view");
  const [scopeTarget, setScopeTarget] = useState<ScopeTarget>("edit");
  const [scope, setScope] = useState<RecurringEditScope>("this");
  const [form, setForm] = useState<EventFormData | null>(null);
  const [fmt, setFmt] = useState<DateFmt>("MDY");
  const fmtInitialised = useRef(false);

  // Reset to view mode whenever occurrence changes
  useEffect(() => {
    setState("view");
    setScope("this");
  }, [occurrence]);

  // Populate form when entering edit state
  useEffect(() => {
    if (state === "edit" && occurrence) {
      setForm(eventToForm(occurrence.event));
    }
  }, [state, occurrence]);

  // Read format preference from localStorage after mount
  useEffect(() => {
    if (!fmtInitialised.current) {
      setFmt(readStoredFmt());
      fmtInitialised.current = true;
    }
  }, []);

  if (!open || !occurrence) return null;

  const event = occurrence.event;
  const isRelease = occurrence.isReleaseDate;
  const isRecurring = occurrence.isRecurring;

  const toggleFmt = () => {
    const next: DateFmt = fmt === "MDY" ? "DMY" : "MDY";
    setFmt(next);
    localStorage.setItem(LS_KEY, next);
  };

  const setF = <K extends keyof EventFormData>(k: K, v: EventFormData[K]) =>
    setForm((f) => f ? { ...f, [k]: v } : f);

  const setRec = <K extends keyof EventFormData["recurrence"]>(
    k: K, v: EventFormData["recurrence"][K]
  ) => setForm((f) => f ? { ...f, recurrence: { ...f.recurrence, [k]: v } } : f);

  const toggleDay = (d: number) => {
    if (!form) return;
    const days = form.recurrence.daysOfWeek.includes(d)
      ? form.recurrence.daysOfWeek.filter((x) => x !== d)
      : [...form.recurrence.daysOfWeek, d];
    setRec("daysOfWeek", days.length ? days : [d]);
  };

  // ── Action handlers ────────────────────────────────────────────────────────

  function handleClickEdit() {
    if (isRecurring) {
      setScopeTarget("edit");
      setScope("this");
      setState("scope");
    } else {
      setState("edit");
    }
  }

  function handleClickDelete() {
    if (isRecurring) {
      setScopeTarget("delete");
      setScope("this");
      setState("scope");
    } else {
      onDelete("all");
    }
  }

  function handleScopeConfirm() {
    if (scopeTarget === "delete") {
      onDelete(scope);
    } else {
      setState("edit");
    }
  }

  function handleSave() {
    if (!form?.title.trim()) return;
    onSave(form, isRecurring ? scope : "all");
  }

  // ── Shared header ──────────────────────────────────────────────────────────

  function ModalHeader({
    showBack,
    title,
    onBack,
  }: {
    showBack?: boolean;
    title: string;
    onBack?: () => void;
  }) {
    return (
      <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
          {!showBack && (
            <h2 className="text-sm font-semibold text-white">{title}</h2>
          )}
          {showBack && (
            <span className="text-sm font-semibold text-white">{title}</span>
          )}
        </div>
        <button onClick={onClose} className="text-neutral-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // ── Color / styling ────────────────────────────────────────────────────────

  const colorStyle = isRelease
    ? RELEASE_EVENT_STYLE
    : getEventColor(event.color);

  // ── VIEW STATE ─────────────────────────────────────────────────────────────

  if (state === "view") {
    const EDITABLE_STATUSES: ReleaseStatus[] = ["draft", "rejected"];
    const canEditRelease = releaseInfo
      ? EDITABLE_STATUSES.includes(releaseInfo.status)
      : false;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
        <div
          className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Colour accent bar */}
          <div className={cn("h-1 w-full rounded-t-2xl", colorStyle.dot)} />

          <div className="p-5">
            {/* Title row */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {isRelease && <Disc3 className="h-4 w-4 shrink-0 text-neutral-400" />}
                  {!isRelease && (
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", colorStyle.dot)} />
                  )}
                  <h2 className="truncate text-base font-semibold text-white leading-snug">
                    {event.title}
                  </h2>
                </div>
                <p className="mt-1.5 text-sm text-neutral-400">
                  {fmtOccurrenceDate(occurrence)}
                </p>
                {isRecurring && event.recurrence && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                    <Repeat2 className="h-3 w-3" />
                    {recurrenceSummary(event.recurrence)}
                  </p>
                )}
              </div>
              <button onClick={onClose} className="mt-0.5 shrink-0 text-neutral-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Details */}
            {(event.description || event.location || event.link || isRelease) && (
              <div className="mb-4 space-y-2 border-t border-neutral-800 pt-4">
                {event.description && (
                  <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {event.description}
                  </p>
                )}
                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{event.location}</span>
                  </div>
                )}
                {event.link && (
                  <div className="flex items-center gap-2 text-sm">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    <a
                      href={event.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-accent hover:underline"
                    >
                      {event.link}
                    </a>
                  </div>
                )}
                {/* Release-specific info */}
                {isRelease && releaseInfo && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        releaseInfo.status === "live"
                          ? "bg-green-900/50 text-green-400"
                          : releaseInfo.status === "submitted" || releaseInfo.status === "processing"
                            ? "bg-yellow-900/50 text-yellow-400"
                            : releaseInfo.status === "rejected"
                              ? "bg-red-900/50 text-red-400"
                              : "bg-neutral-800 text-neutral-400"
                      )}>
                        {releaseInfo.status}
                      </span>
                    </div>
                    <div className="flex gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {canEditRelease
                          ? "To reschedule this release, edit it under Releases. The calendar will update automatically."
                          : `This release is ${releaseInfo.status} and can no longer be rescheduled.`}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Footer */}
            <div className={cn("flex items-center", isRelease ? "justify-end" : "justify-between")}>
              {!isRelease && (
                <button
                  onClick={handleClickDelete}
                  className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
              {isRelease ? (
                <Link
                  href={`/releases/${releaseInfo?.id}`}
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
                >
                  View release
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <Button size="sm" onClick={handleClickEdit}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit event
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SCOPE STATE ────────────────────────────────────────────────────────────

  if (state === "scope") {
    const actionLabel = scopeTarget === "delete" ? "Delete" : "Edit";
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
          <ModalHeader
            showBack
            title={`${actionLabel} recurring event`}
            onBack={() => setState("view")}
          />
          <div className="space-y-1 px-5 py-4">
            {(
              [
                { value: "this", label: "This event" },
                { value: "following", label: "This and following events" },
                { value: "all", label: "All events" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-neutral-800"
              >
                <input
                  type="radio"
                  name="scope"
                  value={opt.value}
                  checked={scope === opt.value}
                  onChange={() => setScope(opt.value)}
                  className="accent-accent"
                />
                <span className="text-sm text-neutral-200">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-neutral-800 px-5 py-4">
            <Button variant="ghost" size="sm" onClick={() => setState("view")}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={scopeTarget === "delete" ? "danger" : "primary"}
              onClick={handleScopeConfirm}
            >
              {scopeTarget === "delete" ? "Delete" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── EDIT STATE ─────────────────────────────────────────────────────────────

  if (state === "edit" && form) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 pt-16 pb-8">
        <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
          <ModalHeader
            showBack
            title="Edit event"
            onBack={() => setState("view")}
          />

          <div className="space-y-5 px-5 py-5">
            {/* Title */}
            <input
              autoFocus
              type="text"
              placeholder="Event title"
              value={form.title}
              onChange={(e) => setF("title", e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-accent"
            />

            {/* All-day toggle */}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => setF("allDay", e.target.checked)}
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
                  onChange={(v) => setF("startDate", v)}
                  fmt={fmt}
                />
                {!form.allDay && (
                  <input
                    type="time" value={form.startTime}
                    onChange={(e) => setF("startTime", e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500">End</label>
                <SplitDateInput
                  value={form.endDate}
                  onChange={(v) => setF("endDate", v)}
                  fmt={fmt}
                />
                {!form.allDay && (
                  <input
                    type="time" value={form.endTime}
                    onChange={(e) => setF("endTime", e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                )}
              </div>
            </div>

            {/* Description */}
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setF("description", e.target.value)}
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
                    onClick={() => setF("color", key)}
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
                type="text" placeholder="Location (optional)"
                value={form.location}
                onChange={(e) => setF("location", e.target.value)}
                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {/* Link */}
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-neutral-500" />
              <input
                type="url" placeholder="Meeting link (optional)"
                value={form.link}
                onChange={(e) => setF("link", e.target.value)}
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
                  <div className="flex items-center gap-2 text-sm text-neutral-300">
                    <span>Every</span>
                    <input
                      type="number" min={1} max={99}
                      value={form.recurrence.interval}
                      onChange={(e) => setRec("interval", Number(e.target.value))}
                      className="w-14 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <select
                      value={form.recurrence.frequency}
                      onChange={(e) => setRec("frequency", e.target.value as EventFormData["recurrence"]["frequency"])}
                      className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {(["daily","weekly","monthly","yearly"] as const).map((f) => (
                        <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                      ))}
                    </select>
                  </div>

                  {form.recurrence.frequency === "weekly" && (
                    <div className="flex gap-1">
                      {DAYS_SHORT.map((d, i) => (
                        <button
                          key={i} type="button" onClick={() => toggleDay(i)}
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
                      onChange={(e) => setRec("endType", e.target.value as EventFormData["recurrence"]["endType"])}
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
                          type="number" min={1}
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
          <div className="flex items-center justify-between border-t border-neutral-800 px-5 py-4">
            <button
              onClick={handleClickDelete}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setState("view")}>
                Cancel
              </Button>
              <Button size="sm" disabled={!form.title.trim()} onClick={handleSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
