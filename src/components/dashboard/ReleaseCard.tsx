"use client";

import Link from "next/link";
import { Music, Calendar } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { Release } from "@/lib/supabase/types";

export function ReleaseCard({ release }: { release: Release }) {
  return (
    <Link
      href={`/releases/${release.id}`}
      className="group block rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition hover:border-neutral-600 hover:bg-neutral-900"
    >
      <div className="flex gap-4">
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-800">
          {release.cover_art_url ? (
            <img
              src={release.cover_art_url}
              alt={release.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music className="h-8 w-8 text-neutral-600" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-medium text-white group-hover:text-neutral-100">
              {release.title}
            </h3>
            <StatusBadge status={release.status} />
          </div>

          <p className="mt-1 text-sm capitalize text-neutral-400">
            {release.type}
            {release.genre && <> &middot; {release.genre}</>}
          </p>

          {release.release_date && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(release.release_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
