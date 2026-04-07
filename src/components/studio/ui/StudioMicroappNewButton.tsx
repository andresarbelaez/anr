"use client";

import { Plus } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type StudioMicroappNewButtonProps = Omit<
  ComponentProps<typeof Button>,
  "variant" | "size" | "children"
> & {
  label: string;
};

/**
 * Uniform “New …” control for studio micro-app toolbars and empty states.
 * Uses {@link Button} `studioMicroappNew` (dark fill, white label, leading Plus).
 */
export function StudioMicroappNewButton({
  label,
  className,
  type = "button",
  ...props
}: StudioMicroappNewButtonProps) {
  return (
    <Button
      type={type}
      variant="studioMicroappNew"
      className={cn(className)}
      {...props}
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      {label}
    </Button>
  );
}
