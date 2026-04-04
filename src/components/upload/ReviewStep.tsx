"use client";

import { Music, Disc3, Calendar, Tag } from "lucide-react";
import type { ReleaseMetadata } from "./MetadataForm";
import type { TrackData } from "./TrackUploader";

interface ReviewStepProps {
  metadata: ReleaseMetadata;
  tracks: TrackData[];
  coverPreview: string | null;
  artistName: string;
}

export function ReviewStep({
  metadata,
  tracks,
  coverPreview,
  artistName,
}: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex gap-6">
        <div className="h-40 w-40 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-800">
          {coverPreview ? (
            <img
              src={coverPreview}
              alt="Cover art"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Disc3 className="h-12 w-12 text-neutral-600" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white">{metadata.title}</h3>
          <p className="text-neutral-400">{artistName}</p>
          <div className="flex flex-wrap gap-3 text-sm text-neutral-500">
            <span className="flex items-center gap-1 capitalize">
              <Tag className="h-3.5 w-3.5" />
              {metadata.type}
            </span>
            {metadata.genre && (
              <span className="flex items-center gap-1">
                <Music className="h-3.5 w-3.5" />
                {metadata.genre}
              </span>
            )}
            {metadata.releaseDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(metadata.releaseDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
          {metadata.description && (
            <p className="mt-2 text-sm text-neutral-400">
              {metadata.description}
            </p>
          )}
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-medium uppercase tracking-wider text-neutral-500">
          Tracklist
        </h4>
        <div className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
          {tracks.map((track) => (
            <div
              key={track.trackNumber}
              className="flex items-center gap-3 px-4 py-3"
            >
              <span className="w-6 text-center text-sm text-neutral-500">
                {track.trackNumber}
              </span>
              <span className="flex-1 text-sm text-white">{track.title}</span>
              {track.explicit && (
                <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">
                  E
                </span>
              )}
              {track.durationSeconds !== null && (
                <span className="text-sm text-neutral-500">
                  {Math.floor(track.durationSeconds / 60)}:
                  {String(track.durationSeconds % 60).padStart(2, "0")}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
