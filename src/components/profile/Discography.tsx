import Image from "next/image";
import { Music, Calendar } from "lucide-react";
import type { Release } from "@/lib/supabase/types";

export function Discography({ releases }: { releases: Release[] }) {
  if (releases.length === 0) {
    return (
      <p className="py-12 text-center text-neutral-500">No releases yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {releases.map((release) => (
        <div key={release.id} className="group space-y-2">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-800">
            {release.cover_art_url ? (
              <Image
                src={release.cover_art_url}
                alt={release.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Music className="h-10 w-10 text-neutral-600" />
              </div>
            )}
          </div>
          <div>
            <h3 className="truncate text-sm font-medium text-white">
              {release.title}
            </h3>
            <p className="flex items-center gap-1 text-xs text-neutral-500">
              <span className="capitalize">{release.type}</span>
              {release.release_date && (
                <>
                  <span>&middot;</span>
                  {new Date(release.release_date).getFullYear()}
                </>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
