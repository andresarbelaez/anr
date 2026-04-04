"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Disc3, BarChart3, Settings, LogOut, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/releases", label: "Releases", icon: Disc3 },
  { href: "/royalties", label: "Royalties", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-black">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-neutral-800 bg-black">
        <div className="flex h-14 items-center border-b border-neutral-800 px-4">
          <Link href="/releases" className="text-lg font-bold text-white">
            ANR
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-800 p-3 space-y-1">
          <a
            href="/donate"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-400 transition hover:bg-neutral-900 hover:text-pink-400"
          >
            <Heart className="h-4 w-4" />
            Support us
          </a>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-56 flex-1 p-8">{children}</main>
    </div>
  );
}
