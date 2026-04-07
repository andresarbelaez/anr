"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  CRM_ROLE_PRESETS,
  isCrmRolePreset,
  normalizeCrmRolesList,
} from "@/lib/crm/crm-roles";

type Props = {
  id: string;
  label: ReactNode;
  value: string[];
  onChange: (next: string[]) => void;
  /** Placeholder for the inline “Other” pill input (default “Other”). */
  otherPlaceholder?: string;
};

function PillPlusIcon({ selected }: { selected: boolean }) {
  return (
    <Plus
      className={cn(
        "h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out",
        selected && "rotate-45"
      )}
      strokeWidth={2.5}
      aria-hidden
    />
  );
}

export function CrmRoleField({
  id,
  label,
  value,
  onChange,
  otherPlaceholder = "Other",
}: Props) {
  const groupId = useId();
  const [otherDraft, setOtherDraft] = useState("");

  const customRoles = value.filter((r) => !isCrmRolePreset(r));
  const canCommitOther = otherDraft.trim().length > 0;

  const togglePreset = (preset: string) => {
    if (value.includes(preset)) {
      onChange(value.filter((r) => r !== preset));
    } else {
      onChange(normalizeCrmRolesList([...value, preset]));
    }
  };

  const removeCustomRole = (role: string) => {
    onChange(value.filter((r) => r !== role));
  };

  const commitOtherDraft = () => {
    const t = otherDraft.trim();
    if (!t) return;
    if (value.includes(t)) {
      setOtherDraft("");
      return;
    }
    onChange(normalizeCrmRolesList([...value, t]));
    setOtherDraft("");
  };

  const onOtherKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (canCommitOther) commitOtherDraft();
    }
  };

  const pillSelected =
    "border-neutral-500 bg-neutral-800 text-neutral-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]";
  const pillIdle =
    "border-neutral-700 bg-neutral-950 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200";

  const togglePillClass = (selected: boolean) =>
    cn(
      "inline-flex max-w-[min(100%,14rem)] items-center gap-0.5 rounded-full border px-2.5 py-1.5 text-sm font-medium transition",
      selected ? pillSelected : pillIdle
    );

  return (
    <div className="space-y-1.5">
      <span
        id={`${groupId}-label`}
        className="block text-sm font-medium text-neutral-300"
      >
        {label}
      </span>

      <div
        role="group"
        aria-labelledby={`${groupId}-label`}
        className="flex flex-wrap items-center gap-2"
      >
        {CRM_ROLE_PRESETS.map((preset) => {
          const selected = value.includes(preset);
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={selected}
              aria-label={
                selected ? `${preset} — selected, tap to remove` : `${preset} — tap to add`
              }
              onClick={() => togglePreset(preset)}
              className={togglePillClass(selected)}
            >
              <PillPlusIcon selected={selected} />
              <span className="min-w-0 truncate">{preset}</span>
            </button>
          );
        })}

        {customRoles.map((role, i) => (
          <button
            key={`${role}-${i}`}
            type="button"
            aria-pressed
            aria-label={`${role} — selected, tap to remove`}
            onClick={() => removeCustomRole(role)}
            className={togglePillClass(true)}
          >
            <PillPlusIcon selected />
            <span className="min-w-0 truncate">{role}</span>
          </button>
        ))}

        <div
          className={cn(
            "inline-flex max-w-[min(100%,18rem)] items-center gap-0.5 rounded-full border py-1 pl-2 pr-2 text-sm transition",
            pillIdle,
            "focus-within:border-neutral-500 focus-within:ring-2 focus-within:ring-white/15"
          )}
        >
          <button
            type="button"
            disabled={!canCommitOther}
            aria-label={
              canCommitOther
                ? "Add custom role"
                : "Add custom role (enter a name first)"
            }
            onClick={(e) => {
              e.preventDefault();
              if (canCommitOther) commitOtherDraft();
            }}
            className={cn(
              "inline-flex shrink-0 rounded-full p-0.5 transition",
              canCommitOther
                ? "text-neutral-400 hover:text-white"
                : "cursor-not-allowed text-neutral-600"
            )}
          >
            <Plus
              className="h-3.5 w-3.5 shrink-0"
              strokeWidth={2.5}
              aria-hidden
            />
          </button>
          <input
            id={id}
            type="text"
            aria-label="Custom role name"
            placeholder={otherPlaceholder}
            value={otherDraft}
            onChange={(e) => setOtherDraft(e.target.value)}
            onKeyDown={onOtherKeyDown}
            className="min-w-[5rem] flex-1 bg-transparent py-0.5 text-sm font-medium text-neutral-100 outline-none placeholder:text-neutral-500"
          />
        </div>
      </div>
    </div>
  );
}
