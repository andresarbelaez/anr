"use client";

import { cn } from "@/lib/utils/cn";
import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: string;
  appearance?: "dark" | "studio";
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, appearance = "dark", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className={cn(
              "block text-sm font-medium",
              appearance === "studio"
                ? "text-[#5a3518]"
                : "text-neutral-300"
            )}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          rows={4}
          className={cn(
            "flex w-full resize-y rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
            appearance === "studio"
              ? "border-[#d4b896] bg-[#fdf8f0] text-[#1e1008] placeholder:text-[#b89070] focus:ring-inset focus:ring-[#a85c10]/35"
              : "border-neutral-700 bg-neutral-900 text-white placeholder:text-neutral-500 focus:ring-white/20",
            error && (appearance === "studio" ? "border-red-600" : "border-red-500"),
            className
          )}
          {...props}
        />
        {error && (
          <p
            className={cn(
              "text-sm",
              appearance === "studio" ? "text-[#a82820]" : "text-red-400"
            )}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea, type TextareaProps };
