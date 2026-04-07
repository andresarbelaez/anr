"use client";

import { cn } from "@/lib/utils/cn";
import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  /** Warm light fields for studio / public listen pages. Default: dashboard dark. */
  appearance?: "dark" | "studio";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type, appearance = "dark", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";

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
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={isPassword && showPassword ? "text" : type}
            className={cn(
              "flex h-10 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
              appearance === "studio"
                ? "bg-[#fdf8f0] text-[#1e1008] placeholder:text-[#b89070] focus:ring-[#a85c10]/35"
                : "border-neutral-700 bg-neutral-900 text-white placeholder:text-neutral-500 focus:ring-white/20",
              isPassword && "pr-10",
              error
                ? "border-red-600"
                : appearance === "studio"
                  ? "border-[#d4b896]"
                  : "border-neutral-700",
              className
            )}
            {...props}
          />
          {isPassword && (
            <Button
              type="button"
              variant="bare"
              onClick={() => setShowPassword((s) => !s)}
              className={cn(
                "absolute right-2.5 top-1/2 h-auto min-h-0 -translate-y-1/2",
                appearance === "studio"
                  ? "text-[#8a6040] hover:text-[#5a3518]"
                  : "text-neutral-500 hover:text-neutral-300"
              )}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
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

Input.displayName = "Input";

export { Input, type InputProps };
