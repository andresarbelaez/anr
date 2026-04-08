"use client";

import dynamic from "next/dynamic";

const CatalogNewClient = dynamic(() => import("./catalog-new-client"), {
  loading: () => (
    <div className="flex min-h-[30vh] items-center justify-center text-sm text-neutral-500">
      Loading…
    </div>
  ),
});

export default function CatalogNewPage() {
  return <CatalogNewClient />;
}
