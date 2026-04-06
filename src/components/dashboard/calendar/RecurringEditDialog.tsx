"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export type RecurringEditScope = "this" | "following" | "all";

interface Props {
  open: boolean;
  mode: "edit" | "delete";
  onConfirm: (scope: RecurringEditScope) => void;
  onCancel: () => void;
}

export function RecurringEditDialog({ open, mode, onConfirm, onCancel }: Props) {
  const [scope, setScope] = useState<RecurringEditScope>("this");

  if (!open) return null;

  const label = mode === "delete" ? "Delete" : "Edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
        <h2 className="mb-4 text-sm font-semibold text-white">{label} recurring event</h2>

        <div className="space-y-3">
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

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={mode === "delete" ? "danger" : "primary"}
            onClick={() => onConfirm(scope)}
          >
            {label}
          </Button>
        </div>
      </div>
    </div>
  );
}
