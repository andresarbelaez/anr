"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

/**
 * Tailwind classes for the primary CTA in embedded studio micro-apps
 * (Library, Releases, Calendar, Feedback, CRM toolbars and empty states).
 * Used by {@link Button} variants `studioMicroappPrimary` and `studioMicroappNew`.
 */
export const studioMicroappPrimaryButtonClasses =
  "h-8 gap-1.5 rounded-sm border border-[#a85c10] bg-[#a85c10] px-3 text-xs font-semibold text-[#ffffff] shadow-sm hover:border-[#924d0e] hover:bg-[#924d0e] hover:text-[#ffffff] focus-visible:ring-amber-700/50 [&_svg]:shrink-0 [&_svg]:text-[#ffffff]";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  /** Text button with underline on hover (no border box). */
  | "link"
  /** Destructive outline — matches library version-row delete (not solid fill). */
  | "danger"
  /** Filled destructive — confirm in dialogs / strongest delete affordance. */
  | "dangerSolid"
  /** Filled success — e.g. mutation approve. */
  | "success"
  /** Blue outline — studio Library “Share” row actions. */
  | "outlineBlue"
  /** Warm brown outline — studio Library “Download” row actions. */
  | "outlineWarm"
  /** Subtle warm border — studio Library play / version label chip. */
  | "outlineSoft"
  /** Filled warm accent — studio Library row actions, etc. */
  | "studioAccent"
  /** Primary CTA in embedded studio micro-apps (amber fill, white label). */
  | "studioMicroappPrimary"
  /** @deprecated Prefer `studioMicroappPrimary` (identical styles). */
  | "studioMicroappNew"
  /** White rounded-square control — embedded / listener audio play. */
  | "circleLight"
  /** Studio viewport “Support us” chip (opens donate modal; fixed bottom-right in /home). */
  | "studioViewportSupport"
  /** Studio viewport “Sign out” — warm dark chip (fixed bottom-right in /home). */
  | "studioViewportSignOut"
  /** No chrome — use with className (e.g. modal backdrop). */
  | "bare";

export type ButtonSize = "micro" | "xs" | "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const compact = size === "micro" || size === "xs";
    const sizeApplies =
      variant !== "link" &&
      variant !== "bare" &&
      variant !== "circleLight" &&
      variant !== "studioViewportSupport" &&
      variant !== "studioViewportSignOut" &&
      variant !== "studioMicroappPrimary" &&
      variant !== "studioMicroappNew";

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex shrink-0 items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50",
          {
            primary:
              "rounded-lg bg-accent text-black hover:bg-accent-hover focus-visible:ring-accent/60",
            secondary:
              "rounded-lg border border-neutral-700 bg-transparent text-white hover:bg-neutral-800 focus-visible:ring-neutral-500/50",
            ghost:
              "rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white focus-visible:ring-neutral-500/50",
            link: "h-auto min-h-0 rounded-none bg-transparent p-0 text-sm text-accent underline-offset-4 hover:underline focus-visible:ring-accent/50",
            danger:
              "rounded-lg border border-red-500/55 bg-transparent text-red-400 hover:bg-red-950/40 focus-visible:ring-red-500/40",
            dangerSolid:
              "rounded-lg bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/60",
            success:
              "rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 focus-visible:ring-emerald-500/50",
            outlineBlue:
              "rounded-sm border border-blue-600/40 bg-transparent text-blue-600 hover:bg-blue-600/10 focus-visible:ring-blue-500/40",
            outlineWarm:
              "rounded-sm border border-[rgba(90,53,24,0.38)] bg-transparent text-[#5a3518] hover:border-[rgba(90,53,24,0.55)] hover:bg-[rgba(90,53,24,0.08)] focus-visible:ring-amber-800/30",
            outlineSoft:
              "rounded-sm border border-[#ecddc8] bg-transparent text-[#8a6040] hover:border-[#d4b896] hover:bg-black/[0.03] hover:text-[#5a3518] focus-visible:ring-amber-900/25",
            studioAccent:
              "rounded-sm border border-[#a85c10] bg-[#a85c10] font-medium text-white hover:bg-[#924d0e] focus-visible:ring-amber-700/50",
            studioMicroappPrimary: studioMicroappPrimaryButtonClasses,
            studioMicroappNew: studioMicroappPrimaryButtonClasses,
            circleLight:
              "h-10 w-10 shrink-0 rounded-lg border-0 bg-white p-0 text-black hover:bg-neutral-200 focus-visible:ring-white/50",
            studioViewportSupport:
              "w-full justify-start gap-2 rounded border border-[rgba(140,92,50,0.55)] bg-[rgba(28,18,8,0.92)] px-3 py-2 text-xs text-[#e8d4c8] shadow-[0_4px_14px_rgba(0,0,0,0.45)] transition-colors hover:bg-[rgba(40,26,12,0.96)] hover:border-[rgba(200,120,140,0.55)] hover:text-[#f9a8c8] focus-visible:ring-[rgba(200,120,140,0.45)]",
            studioViewportSignOut:
              "w-full justify-start gap-2 rounded border border-[rgba(140,92,50,0.55)] bg-[rgba(28,18,8,0.92)] px-3 py-2 text-xs text-[#e8d4c8] shadow-[0_4px_14px_rgba(0,0,0,0.45)] transition-colors hover:bg-[rgba(40,26,12,0.96)] hover:border-[rgba(180,150,110,0.65)] hover:text-[#fff8f0] focus-visible:ring-[rgba(180,150,110,0.45)]",
            bare: "inline-flex h-auto min-h-0 rounded-none border-0 bg-transparent p-0 font-inherit shadow-none focus-visible:ring-white/30",
          }[variant],
          sizeApplies && {
            micro:
              "h-auto min-h-[22px] gap-1 px-1.5 py-[3px] text-[10px] leading-tight",
            xs: "h-7 gap-1.5 rounded-lg px-2.5 text-xs",
            sm: "h-8 gap-2 rounded-lg px-3 text-sm",
            md: "h-10 gap-2 rounded-lg px-4 text-sm",
            lg: "h-12 gap-2 rounded-lg px-6 text-base",
            icon: "h-10 w-10 shrink-0 rounded-lg p-0",
          }[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className={cn("animate-spin", compact ? "h-3 w-3" : "h-4 w-4")}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
