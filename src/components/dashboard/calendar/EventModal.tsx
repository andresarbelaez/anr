"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}

export function EventModal({ open, prefillDate, onSave, onClose }: Props) {
  const [form, setForm] = useState<EventFormData>(defaultForm(prefillDate));
  const { fmt, toggleFmt } = useCalendarDateFmt();

  useEffect(() => {
    if (!open) return;
    setForm(defaultForm(prefillDate));
  }, [open, prefillDate]);

  if (!open) return null;

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
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">New event</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <EventFormFields
          form={form}
          set={set}
          setRec={setRec}
          fmt={fmt}
          toggleFmt={toggleFmt}
          toggleDay={toggleDay}
        />

        <div className="flex items-center justify-end gap-2 border-t border-neutral-800 px-5 py-4">
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
  );
}
