"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  Disc3,
  Home,
  ListMusic,
  MessageSquare,
  User,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type NavIcon = typeof Home;

type NavItem = {
  section: string | null;
  href: string;
  label: string;
  icon: NavIcon;
};

const navItems: NavItem[] = [
  { section: null, href: "/home", label: "Home", icon: Home },
  {
    section: "assistant",
    href: "/home?open=assistant",
    label: "Assistant",
    icon: Sparkles,
  },
  {
    section: "calendar",
    href: "/home?open=calendar",
    label: "Calendar",
    icon: CalendarDays,
  },
  {
    section: "releases",
    href: "/home?open=releases",
    label: "Releases",
    icon: Disc3,
  },
  {
    section: "library",
    href: "/home?open=library",
    label: "Library",
    icon: ListMusic,
  },
  {
    section: "feedback",
    href: "/home?open=feedback",
    label: "Feedback",
    icon: MessageSquare,
  },
  {
    section: "crm",
    href: "/home?open=crm",
    label: "Contacts",
    icon: Users,
  },
  {
    section: "royalties",
    href: "/home?open=royalties",
    label: "Royalties",
    icon: BarChart3,
  },
  {
    section: "settings",
    href: "/home?open=settings",
    label: "My Profile",
    icon: User,
  },
];

function isChromeNavActive(item: NavItem, pathname: string): boolean {
  const section = item.section;
  if (section === "settings" && pathname === "/settings") return true;
  if (section === "releases" && pathname.startsWith("/releases")) return true;
  if (section === "library" && pathname.startsWith("/catalog")) return true;
  if (section === "crm" && pathname.startsWith("/crm")) return true;
  if (section === "feedback" && pathname.startsWith("/feedback")) return true;
  if (section === "royalties" && pathname.startsWith("/royalties")) return true;
  return false;
}

export function DashboardNavChrome() {
  const pathname = usePathname();
  if (pathname === "/home") return null;

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-neutral-800 bg-black/95 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-black/80">
      <Link
        href="/home"
        className="shrink-0 px-2 text-lg font-bold text-white transition hover:text-accent"
      >
        sidestage
      </Link>
      <nav
        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Dashboard"
      >
        {navItems.map((item) => {
          const active = isChromeNavActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition sm:text-sm",
                active
                  ? "bg-neutral-900 text-accent"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              )}
            >
              <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
