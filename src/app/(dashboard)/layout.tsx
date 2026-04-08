"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  CatalogPlayerProvider,
  useCatalogPlayer,
} from "@/contexts/catalog-player-context";
import { CatalogPlayerBar } from "@/components/dashboard/CatalogPlayerBar";
import { DashboardNavChrome } from "@/components/dashboard/DashboardNavChrome";

function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideGlobalCatalogPlayer = pathname === "/home";
  const showTopChrome = pathname !== "/home";
  const { activeTrack, playerLoading, playerError } = useCatalogPlayer();
  const playerOpen = !!(activeTrack || playerLoading || playerError);
  const reservePlayerPadding = playerOpen && !hideGlobalCatalogPlayer;

  return (
    <main
      className={cn(
        "relative flex min-h-screen flex-1 flex-col",
        showTopChrome && "pt-14"
      )}
    >
      <div className={cn("flex-1 p-8", reservePlayerPadding && "pb-28")}>
        {children}
      </div>
      {!hideGlobalCatalogPlayer && <CatalogPlayerBar />}
    </main>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CatalogPlayerProvider>
      <div className="flex min-h-screen bg-black">
        <DashboardNavChrome />

        <DashboardMain>{children}</DashboardMain>
      </div>
    </CatalogPlayerProvider>
  );
}
