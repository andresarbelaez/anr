"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { S } from "@/components/studio/ui/s";

export function AuthTabs() {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isSignup = pathname === "/signup";

  return (
    <div
      className="flex rounded-lg border p-1"
      style={{
        borderColor: S.border,
        background: S.surfaceAlt,
      }}
    >
      <Link
        href="/login"
        className={cn(
          "flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition",
          isLogin
            ? "text-white shadow-sm"
            : "text-[#8a6040] hover:text-[#5a3518]"
        )}
        style={
          isLogin
            ? { background: S.accent, color: S.accentText }
            : undefined
        }
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className={cn(
          "flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition",
          isSignup
            ? "text-white shadow-sm"
            : "text-[#8a6040] hover:text-[#5a3518]"
        )}
        style={
          isSignup
            ? { background: S.accent, color: S.accentText }
            : undefined
        }
      >
        Sign up
      </Link>
    </div>
  );
}
