import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export type CrmCollabPillKind = "release" | "catalog";

type CrmCollabPillProps = {
  kind: CrmCollabPillKind;
  href: string;
  children: React.ReactNode;
  title?: string;
};

/**
 * Release collaborations: green. Library (catalog) songs: neutral grey.
 */
export function CrmCollabPill({ kind, href, children, title }: CrmCollabPillProps) {
  return (
    <Link
      href={href}
      title={title}
      className={cn(
        "inline-flex max-w-[11rem] shrink-0 items-center truncate rounded-full border px-2.5 py-0.5 text-xs font-medium transition hover:opacity-90",
        kind === "release"
          ? "border-emerald-600/70 bg-emerald-950/80 text-emerald-100"
          : "border-neutral-600 bg-neutral-800/90 text-neutral-200"
      )}
    >
      {children}
    </Link>
  );
}
