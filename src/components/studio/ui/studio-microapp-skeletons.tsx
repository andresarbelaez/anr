"use client";

import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { S } from "@/components/studio/ui/s";

function Bone({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("studio-microapp-shimmer-bone rounded", className)}
      style={style}
    />
  );
}

function Shell({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div
      className="flex min-h-[200px] flex-1 flex-col overflow-hidden"
      style={{ background: S.bg }}
      aria-busy="true"
      aria-label={label}
    >
      {children}
    </div>
  );
}

const CAL_WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Month grid only — real calendar chrome stays visible (studio + data fetch). */
export function StudioMicroappSkeletonCalendarGridEmbedded() {
  return (
    <div
      className="flex min-h-[200px] flex-1 flex-col gap-1.5 p-2"
      role="status"
      aria-busy="true"
      aria-label="Loading calendar"
    >
      <div className="grid grid-cols-7 gap-1 px-0.5">
        {CAL_WEEKDAYS.map((d, i) => (
          <div key={`${d}-${i}`} className="flex justify-center pb-1">
            <Bone className="h-3 w-4 rounded-sm opacity-70" />
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1">
        {Array.from({ length: 42 }).map((_, i) => (
          <Bone
            key={i}
            className="min-h-[2.25rem] rounded-md sm:min-h-[2.75rem]"
            style={{ opacity: 0.75 + (i % 5) * 0.03 }}
          />
        ))}
      </div>
    </div>
  );
}

/** Month-style header strip + weekday row + 6×7 day cells */
export function StudioMicroappSkeletonCalendar() {
  return (
    <Shell label="Loading calendar">
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5"
        style={{ borderColor: S.border }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Bone className="h-8 w-[7.5rem] rounded-lg" />
          <Bone className="h-8 w-16 rounded-lg" />
          <Bone className="h-8 w-8 rounded-lg" />
          <Bone className="h-8 w-8 rounded-lg" />
          <Bone className="h-5 w-36 rounded" />
        </div>
        <Bone className="h-9 w-[6.5rem] rounded-md" />
      </div>
      <StudioMicroappSkeletonCalendarGridEmbedded />
    </Shell>
  );
}

/** Single column of “form sections” like ArtistProfileSettingsForm */
export function StudioMicroappSkeletonSettings() {
  return (
    <Shell label="Loading settings">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
        {Array.from({ length: 4 }).map((_, section) => (
          <div key={section} className="flex flex-col gap-3">
            <Bone className="h-4 w-40 rounded" />
            <Bone className="h-10 w-full max-w-md rounded-md" />
            <Bone className="h-10 w-full max-w-md rounded-md" />
            <Bone className="h-24 w-full max-w-lg rounded-md" />
          </div>
        ))}
      </div>
    </Shell>
  );
}

/** Chat area + composer — header stays visible in AssistantClient. */
export function StudioMicroappSkeletonAssistantEmbedded() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3"
      role="status"
      aria-busy="true"
      aria-label="Loading assistant"
    >
      <div className="flex flex-1 flex-col justify-end gap-3">
        <div className="flex justify-start">
          <Bone className="h-12 w-[78%] max-w-sm rounded-2xl rounded-bl-md" />
        </div>
        <div className="flex justify-end">
          <Bone className="h-10 w-[65%] max-w-xs rounded-2xl rounded-br-md" />
        </div>
        <div className="flex justify-start">
          <Bone className="h-20 w-[85%] max-w-md rounded-2xl rounded-bl-md" />
        </div>
      </div>
      <div className="flex shrink-0 gap-2 pt-1">
        <Bone className="h-24 flex-1 rounded-xl" />
        <Bone className="h-24 w-14 shrink-0 rounded-xl" />
      </div>
    </div>
  );
}

/** Transcript bubbles + composer bar */
export function StudioMicroappSkeletonAssistant() {
  return (
    <Shell label="Loading assistant">
      <StudioMicroappSkeletonAssistantEmbedded />
    </Shell>
  );
}

function ListToolbar() {
  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5"
      style={{ borderColor: S.border }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Bone className="h-8 w-24 rounded-md" />
        <Bone className="h-8 w-20 rounded-md" />
        <Bone className="h-8 w-28 rounded-md" />
      </div>
      <Bone className="h-9 w-[7rem] rounded-md" />
    </div>
  );
}

function listRowBones(rows: number) {
  return Array.from({ length: rows }).map((_, i) => (
    <div
      key={i}
      className="flex shrink-0 items-center gap-3 rounded-md border p-2.5"
      style={{ borderColor: S.borderFaint, background: S.surface }}
    >
      <Bone className="h-11 w-11 shrink-0 rounded" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
        <Bone className="h-3.5 w-[55%] max-w-xs rounded" />
        <Bone className="h-3 w-[35%] max-w-[12rem] rounded" />
      </div>
      <Bone className="h-6 w-6 shrink-0 rounded opacity-80" />
    </div>
  ));
}

function ListRows({ rows = 7 }: { rows?: number }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
      {listRowBones(rows)}
    </div>
  );
}

/** List micro-apps: rows only (toolbar above is already the real one). */
export function StudioMicroappSkeletonListRowsEmbedded({
  rows = 6,
}: {
  rows?: number;
}) {
  return (
    <div
      className="flex flex-col gap-2"
      role="status"
      aria-busy="true"
      aria-label="Loading list"
    >
      {listRowBones(rows)}
    </div>
  );
}

export function StudioMicroappSkeletonReleases() {
  return (
    <Shell label="Loading releases">
      <ListToolbar />
      <ListRows rows={6} />
    </Shell>
  );
}

export function StudioMicroappSkeletonLibrary() {
  return (
    <Shell label="Loading library">
      <ListToolbar />
      <ListRows rows={7} />
    </Shell>
  );
}

export function StudioMicroappSkeletonFeedback() {
  return (
    <Shell label="Loading feedback">
      <ListToolbar />
      <ListRows rows={6} />
    </Shell>
  );
}

export function StudioMicroappSkeletonCrm() {
  return (
    <Shell label="Loading CRM">
      <ListToolbar />
      <ListRows rows={7} />
    </Shell>
  );
}

function RoyaltiesStatsBones({
  trailingSpacing = true,
}: {
  trailingSpacing?: boolean;
} = {}) {
  return (
    <div
      className="flex flex-wrap"
      style={{
        gap: 10,
        ...(trailingSpacing ? { marginBottom: 20 } : {}),
      }}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="min-w-[8.5rem] flex-1 rounded-md border p-3"
          style={{ borderColor: S.border, background: S.surface }}
        >
          <Bone className="mb-2 h-3 w-20 rounded" />
          <Bone className="h-7 w-28 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function RoyaltiesListBones() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex shrink-0 items-center justify-between gap-3 rounded-md border px-3 py-3"
          style={{ borderColor: S.borderFaint, background: S.surface }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Bone className="h-10 w-10 shrink-0 rounded" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bone className="h-3.5 w-[50%] max-w-[14rem] rounded" />
              <Bone className="h-3 w-24 rounded" />
            </div>
          </div>
          <Bone className="h-5 w-5 shrink-0 rounded opacity-70" />
        </div>
      ))}
    </div>
  );
}

/** Royalties list view — stats + rows; “Royalties” header stays real. */
export function StudioMicroappSkeletonRoyaltiesEmbedded() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading royalties">
      <RoyaltiesStatsBones />
      <RoyaltiesListBones />
    </div>
  );
}

/** Summary stat cards + release rows */
export function StudioMicroappSkeletonRoyalties() {
  return (
    <Shell label="Loading royalties">
      <div
        className="shrink-0 border-b p-3"
        style={{ borderColor: S.border }}
      >
        <RoyaltiesStatsBones trailingSpacing={false} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        <RoyaltiesListBones />
      </div>
    </Shell>
  );
}

function DashboardBone({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-neutral-800", className)}
    >
      <div
        aria-hidden
        className="studio-microapp-shimmer-sheen-inline pointer-events-none absolute inset-y-0 w-[48%]"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
        }}
      />
    </div>
  );
}

/** Dashboard `/settings` — dark theme, column layout */
export function DashboardSettingsPageSkeleton() {
  return (
    <div
      className="flex min-h-[48vh] w-full max-w-2xl flex-col gap-6 py-6"
      aria-busy="true"
      aria-label="Loading settings"
    >
      {Array.from({ length: 4 }).map((_, section) => (
        <div key={section} className="flex flex-col gap-3">
          <DashboardBone className="h-4 w-44 rounded" />
          <DashboardBone className="h-10 w-full" />
          <DashboardBone className="h-10 w-full" />
          {section === 0 ? (
            <DashboardBone className="h-24 w-full" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
