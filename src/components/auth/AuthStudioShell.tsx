"use client";

import type { ReactNode } from "react";
import { S } from "@/components/studio/ui/s";

type Props = {
  children: ReactNode;
};

/**
 * Parchment background + cream card; matches studio micro-app chrome.
 */
export function AuthStudioShell({ children }: Props) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10"
      style={{ background: S.bg }}
    >
      <div
        className="w-full max-w-sm rounded-xl border p-6 shadow-sm sm:p-8"
        style={{
          background: S.surface,
          borderColor: S.border,
          boxShadow: "0 8px 32px rgba(30, 16, 8, 0.07)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
