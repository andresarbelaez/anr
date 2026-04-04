import { cn } from "@/lib/utils/cn";
import type { ReleaseStatus } from "@/lib/supabase/types";

const statusConfig: Record<
  ReleaseStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-neutral-800 text-neutral-300",
  },
  submitted: {
    label: "Submitted",
    className: "bg-blue-900/50 text-blue-300 border border-blue-800",
  },
  processing: {
    label: "Processing",
    className: "bg-yellow-900/50 text-yellow-300 border border-yellow-800",
  },
  live: {
    label: "Live",
    className: "bg-green-900/50 text-green-300 border border-green-800",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-900/50 text-red-300 border border-red-800",
  },
};

export function StatusBadge({ status }: { status: ReleaseStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {status === "processing" && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
      )}
      {status === "live" && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-400" />
      )}
      {config.label}
    </span>
  );
}
