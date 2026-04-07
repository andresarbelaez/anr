"use client";

import type { DashboardIoMessage } from "@/hooks/use-dashboard-csv-io";
import { cn } from "@/lib/utils/cn";

export function DashboardCsvIoBanner({
  message,
  className,
}: {
  message: DashboardIoMessage | null;
  className?: string;
}) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        className,
        message.kind === "success"
          ? "border-green-800 bg-green-950/40 text-green-200"
          : "border-red-800 bg-red-950/40 text-red-200"
      )}
    >
      {message.text}
    </div>
  );
}
