"use client";

import { Plus } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type StudioMicroappPrimaryButtonProps = Omit<
  ComponentProps<typeof Button>,
  "variant" | "size" | "children"
> & {
  label: string;
  /** Default true: leading + icon (toolbar “New …” pattern). Set false for actions like “Share link”. */
  showLeadingPlus?: boolean;
};

/**
 * Primary toolbar / empty-state CTA for embedded studio micro-apps.
 * Uses {@link Button} `studioMicroappPrimary` (amber fill, white label).
 */
export function StudioMicroappPrimaryButton({
  label,
  showLeadingPlus = true,
  className,
  type = "button",
  ...props
}: StudioMicroappPrimaryButtonProps) {
  return (
    <Button
      type={type}
      variant="studioMicroappPrimary"
      className={cn(className)}
      {...props}
    >
      {showLeadingPlus ? (
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      ) : null}
      {label}
    </Button>
  );
}

/** @deprecated Use `StudioMicroappPrimaryButton` (same component). */
export const StudioMicroappNewButton = StudioMicroappPrimaryButton;
/** @deprecated Use `StudioMicroappPrimaryButtonProps`. */
export type StudioMicroappNewButtonProps = StudioMicroappPrimaryButtonProps;
