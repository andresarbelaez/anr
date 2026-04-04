"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Music, Calendar, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import type { Release, Track } from "@/lib/supabase/types";

export default function ReleaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [release, setRelease] = useState<Release | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: rel } = await supabase
        .from("releases")
        .select("*")
        .eq("id", id)
        .single();

      if (rel) {
        setRelease(rel as Release);

        const { data: t } = await supabase
          .from("tracks")
          .select("*")
          .eq("release_id", id)
          .order("track_number");

        setTracks((t as Track[]) || []);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  if (!release) {
    return (
      <div className="py-20 text-center">
        <p className="text-neutral-400">Release not found.</p>
        <Button variant="ghost" onClick={() => router.push("/releases")} className="mt-4">
          Back to releases
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.push("/releases")}
        className="mb-6 flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        All releases
      </button>

      <div className="flex gap-6">
        <div className="h-48 w-48 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-800">
          {release.cover_art_url ? (
            <img
              src={release.cover_art_url}
              alt={release.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music className="h-12 w-12 text-neutral-600" />
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{release.title}</h1>
            <StatusBadge status={release.status} />
          </div>

          <p className="mt-2 text-neutral-400 capitalize">
            {release.type}
            {release.genre && <> &middot; {release.genre}</>}
          </p>

          {release.release_date && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-neutral-500">
              <Calendar className="h-4 w-4" />
              {new Date(release.release_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          )}

          {release.description && (
            <p className="mt-4 max-w-lg text-sm text-neutral-400">
              {release.description}
            </p>
          )}

          {release.upc && (
            <p className="mt-3 text-xs text-neutral-600">UPC: {release.upc}</p>
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-500">
          Tracks
        </h2>

        {tracks.length === 0 ? (
          <p className="text-sm text-neutral-500">No tracks uploaded.</p>
        ) : (
          <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-4 px-4 py-3"
              >
                <span className="w-6 text-center text-sm text-neutral-500">
                  {track.track_number}
                </span>
                <span className="flex-1 text-sm text-white">{track.title}</span>
                {track.explicit && (
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">
                    E
                  </span>
                )}
                {track.isrc && (
                  <span className="text-xs text-neutral-600">{track.isrc}</span>
                )}
                {track.duration_seconds != null && (
                  <span className="text-sm text-neutral-500">
                    {Math.floor(track.duration_seconds / 60)}:
                    {String(track.duration_seconds % 60).padStart(2, "0")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
