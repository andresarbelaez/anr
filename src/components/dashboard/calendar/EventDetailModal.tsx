"use client";

import { type MutableRefObject, useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { getEventColor, RELEASE_EVENT_STYLE } from "@/lib/utils/calendar-colors";
import type {
  CalendarOccurrence,
  RecurrenceRule,
  RecurringEditScope,
  ReleaseStatus,
} from "@/lib/supabase/types";
import {
  eventToForm,
  EventFormFields,
  formToEventPayload,
  isoDatePart,
  isoTimePart,
  useCalendarDateFmt,
  type EventFormData,
} from "./event-form-shared";

export type { EventFormData } from "./event-form-shared";
export { formToEventPayload };

function fmtOccurrenceDate(occ: CalendarOccurrence): string {
  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };

  if (occ.event.all_day) {
    const [y, m, d] = occ.occurrenceDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", dateOpts);
  }

  const [y, m, d] = isoDatePart(occ.event.start_at).split("-").map(Number);
  const [startH, startMin] = isoTimePart(occ.event.start_at)
    .split(":")
    .map(Number);
  const startLocal = new Date(y, m - 1, d, startH, startMin);
  const datePart = startLocal.toLocaleDateString("en-US", dateOpts);
  const startTime = startLocal.toLocaleTimeString("en-US", timeOpts);

  if (!occ.endAt) return `${datePart} at ${startTime}`;

  const [ey, em, ed] = (
    occ.event.end_at
      ? isoDatePart(occ.event.end_at)
      : isoDatePart(occ.event.start_at)
  )
    .split("-")
    .map(Number);
  const [endH, endMin] = (
    occ.event.end_at
      ? isoTimePart(occ.event.end_at)
      : isoTimePart(occ.event.start_at)
  )
    .split(":")
    .map(Number);
  const endLocal = new Date(ey, em - 1, ed, endH, endMin);
  const endTime = endLocal.toLocaleTimeString("en-US", timeOpts);

  return `${datePart}, ${startTime} – ${endTime}`;
}

function recurrenceSummary(rule: RecurrenceRule): string {
  const n = rule.interval ?? 1;
  if (rule.frequency === "daily")
    return n === 1 ? "Every day" : `Every ${n} days`;
  if (rule.frequency === "weekly") {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = rule.days_of_week?.length
      ? [...rule.days_of_week]
          .sort((a, b) => a - b)
          .map((d) => names[d])
          .join(", ")
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

type ModalState = "view" | "scope" | "edit";
type ScopeTarget = "edit" | "delete";

function DetailModalHeader({
  showBack,
  title,
  onBack,
  onClose,
  showCloseButton = true,
}: {
  showBack?: boolean;
  title: string;
  onBack?: () => void;
  onClose: () => void;
  showCloseButton?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-5 py-4">
      <div className="flex min-w-0 items-center gap-2">
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-1 text-sm text-neutral-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}
        {!showBack && (
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        )}
        {showBack && (
          <span className="min-w-0 truncate text-sm font-semibold text-white">
            {title}
          </span>
        )}
      </div>
      {showCloseButton ? (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-neutral-500 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

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
  /** `panel` = in-studio stack (no viewport overlay). */
  presentation?: "modal" | "panel";
  /** When `presentation` is `panel`, parent window back consults this first (nested scope/edit → view). */
  chromeBackRef?: MutableRefObject<() => boolean>;
}

export function EventDetailModal({
  open,
  occurrence,
  releaseInfo,
  onSave,
  onDelete,
  onClose,
  presentation = "modal",
  chromeBackRef,
}: Props) {
  const [state, setState] = useState<ModalState>("view");
  const [scopeTarget, setScopeTarget] = useState<ScopeTarget>("edit");
  const [scope, setScope] = useState<RecurringEditScope>("this");
  const [form, setForm] = useState<EventFormData | null>(null);
  const { fmt, toggleFmt } = useCalendarDateFmt();

  useEffect(() => {
    setState("view");
    setScope("this");
  }, [occurrence]);

  useEffect(() => {
    if (state === "edit" && occurrence) {
      setForm(eventToForm(occurrence.event));
    }
  }, [state, occurrence]);

  if (!open || !occurrence) return null;

  const isPanel = presentation === "panel";
  if (chromeBackRef) {
    if (isPanel) {
      chromeBackRef.current = () => {
        if (state === "view") return false;
        if (state === "scope") {
          setState("view");
          return true;
        }
        if (state === "edit") {
          setState("view");
          return true;
        }
        return false;
      };
    } else {
      chromeBackRef.current = () => false;
    }
  }

  const event = occurrence.event;
  const isRelease = occurrence.isReleaseDate;
  const isRecurring = occurrence.isRecurring;

  const setF = <K extends keyof EventFormData>(k: K, v: EventFormData[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const setRec = <K extends keyof EventFormData["recurrence"]>(
    k: K,
    v: EventFormData["recurrence"][K]
  ) => setForm((f) => (f ? { ...f, recurrence: { ...f.recurrence, [k]: v } } : f));

  const toggleDay = (d: number) => {
    if (!form) return;
    const days = form.recurrence.daysOfWeek.includes(d)
      ? form.recurrence.daysOfWeek.filter((x) => x !== d)
      : [...form.recurrence.daysOfWeek, d];
    setRec("daysOfWeek", days.length ? days : [d]);
  };

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

  const colorStyle = isRelease
    ? RELEASE_EVENT_STYLE
    : getEventColor(event.color);

  if (state === "view") {
    const EDITABLE_STATUSES: ReleaseStatus[] = ["draft", "rejected"];
    const canEditRelease = releaseInfo
      ? EDITABLE_STATUSES.includes(releaseInfo.status)
      : false;

    const viewBody = (
      <>
        <div
          className={cn(
            "h-1 w-full shrink-0",
            colorStyle.dot,
            isPanel ? "" : "rounded-t-2xl"
          )}
        />

        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isRelease && (
                  <Disc3 className="h-4 w-4 shrink-0 text-neutral-400" />
                )}
                {!isRelease && (
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      colorStyle.dot
                    )}
                  />
                )}
                <h2 className="truncate text-base font-semibold leading-snug text-white">
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
            {!isPanel ? (
              <button
                type="button"
                onClick={onClose}
                className="mt-0.5 shrink-0 text-neutral-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {(event.description ||
            event.location ||
            event.link ||
            isRelease) && (
            <div className="mb-4 space-y-2 border-t border-neutral-800 pt-4">
              {event.description && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
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
              {isRelease && releaseInfo && (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        releaseInfo.status === "live"
                          ? "bg-green-900/50 text-green-400"
                          : releaseInfo.status === "submitted" ||
                              releaseInfo.status === "processing"
                            ? "bg-yellow-900/50 text-yellow-400"
                            : releaseInfo.status === "rejected"
                              ? "bg-red-900/50 text-red-400"
                              : "bg-neutral-800 text-neutral-400"
                      )}
                    >
                      {releaseInfo.status}
                    </span>
                  </div>
                  <div className="flex gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                    <p className="text-xs leading-relaxed text-neutral-400">
                      {canEditRelease
                        ? "To reschedule this release, edit it under Releases. The calendar will update automatically."
                        : `This release is ${releaseInfo.status} and can no longer be rescheduled.`}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <div
            className={cn(
              "flex items-center",
              isRelease ? "justify-end" : "justify-between"
            )}
          >
            {!isRelease && (
              <button
                type="button"
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
                className="flex items-center justify-center gap-2 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
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
      </>
    );

    if (isPanel) {
      return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto border-t border-neutral-800 bg-neutral-950">
          <div className="w-full border-x border-b border-neutral-800 bg-neutral-950">
            {viewBody}
          </div>
        </div>
      );
    }

    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="z-[5300] bg-black/70"
          className="z-[5301] w-full max-w-sm gap-0 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-0 shadow-2xl sm:max-w-sm"
        >
          <DialogTitle className="sr-only">{event.title}</DialogTitle>
          {viewBody}
        </DialogContent>
      </Dialog>
    );
  }

  if (state === "scope") {
    const actionLabel = scopeTarget === "delete" ? "Delete" : "Edit";
    const scopeBody = (
      <>
        <DetailModalHeader
          showBack
          title={`${actionLabel} recurring event`}
          onBack={() => setState("view")}
          onClose={onClose}
          showCloseButton={!isPanel}
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
      </>
    );

    if (isPanel) {
      return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto border-t border-neutral-800 bg-neutral-950">
          <div className="w-full border-x border-b border-neutral-800 bg-neutral-950">
            {scopeBody}
          </div>
        </div>
      );
    }

    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="z-[5300] bg-black/70"
          className="z-[5301] w-full max-w-sm gap-0 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-0 shadow-2xl sm:max-w-sm"
        >
          <DialogTitle className="sr-only">
            {scopeTarget === "delete" ? "Delete" : "Edit"} recurring event
          </DialogTitle>
          {scopeBody}
        </DialogContent>
      </Dialog>
    );
  }

  if (state === "edit" && form) {
    const editBody = (
      <>
        <DetailModalHeader
          showBack
          title="Edit event"
          onBack={() => setState("view")}
          onClose={onClose}
          showCloseButton={!isPanel}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <EventFormFields
            form={form}
            set={setF}
            setRec={setRec}
            fmt={fmt}
            toggleFmt={toggleFmt}
            toggleDay={toggleDay}
          />
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-neutral-800 px-5 py-4">
          <button
            type="button"
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
            <Button
              size="sm"
              disabled={!form.title.trim()}
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </div>
      </>
    );

    if (isPanel) {
      return (
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-t border-neutral-800 bg-neutral-950">
          {editBody}
        </div>
      );
    }

    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="z-[5300] bg-black/70"
          className="z-[5301] flex max-h-[min(90vh,calc(100vh-4rem))] w-full max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-0 shadow-2xl sm:max-w-lg"
        >
          <DialogTitle className="sr-only">Edit event</DialogTitle>
          {editBody}
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
