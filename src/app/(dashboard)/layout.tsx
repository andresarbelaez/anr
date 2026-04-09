"use client";

import { CatalogPlayerProvider } from "@/contexts/catalog-player-context";

/**
 * Signed-in shell: studio **`/home`** is the primary UI. Other dashboard routes
 * are thin **`redirect()`** targets into **`/home?…`**. **`CatalogPlayerProvider`**
 * supplies library playback state for **`StudioLibraryWindow`** / mobile shell.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CatalogPlayerProvider>
      <div className="flex min-h-screen bg-black">
        <main className="relative flex min-h-screen flex-1 flex-col">
          <div className="flex-1 p-8">{children}</div>
        </main>
      </div>
    </CatalogPlayerProvider>
  );
}
