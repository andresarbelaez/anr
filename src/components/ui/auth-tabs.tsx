"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function AuthTabs() {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isSignup = pathname === "/signup";

  return (
    <div className="flex rounded-lg border border-neutral-800 bg-neutral-900/50 p-1">
      <Link
        href="/login"
        className={cn(
          "flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition",
          isLogin
            ? "bg-white text-black"
            : "text-neutral-400 hover:text-white"
        )}
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className={cn(
          "flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition",
          isSignup
            ? "bg-white text-black"
            : "text-neutral-400 hover:text-white"
        )}
      >
        Sign up
      </Link>
    </div>
  );
}
