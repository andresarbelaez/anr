"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  defaultForm,
  EventFormFields,
  formToEventPayload,
  useCalendarDateFmt,
  type EventFormData,
} from "./event-form-shared";

export type { DateFmt, EventFormData } from "./event-form-shared";
export { formToEventPayload };

interface Props {
  open: boolean;
  prefillDate?: string;
  onSave: (form: EventFormData) => void;
  onClose: () => void;
  /** `panel` = in-studio stack (no viewport overlay). */
  presentation?: "modal" | "panel";
}

export function EventModal({
  open,
  prefillDate,
  onSave,
  onClose,
  presentation = "modal",
}: Props) {
  const [form, setForm] = useState<EventFormData>(defaultForm(prefillDate));
  const { fmt, toggleFmt } = useCalendarDateFmt();

  useEffect(() => {
    if (!open) return;
    setForm(defaultForm(prefillDate));
  }, [open, prefillDate]);

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

  const header = (
    <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-5 py-4">
      <h2 className="text-sm font-semibold text-white">New event</h2>
      {presentation === "modal" ? (
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-500 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );

  const footer = (
    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-800 px-5 py-4">
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
  );

  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <EventFormFields
        form={form}
        set={set}
        setRec={setRec}
        fmt={fmt}
        toggleFmt={toggleFmt}
        toggleDay={toggleDay}
      />
    </div>
  );

  if (presentation === "panel") {
    if (!open) return null;
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-t border-neutral-800 bg-neutral-950">
        {header}
        {body}
        {footer}
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
        <DialogTitle className="sr-only">New event</DialogTitle>
        {header}
        {body}
        {footer}
      </DialogContent>
    </Dialog>
  );
}
