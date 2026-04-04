"use client";

import { cn } from "@/lib/utils/cn";

interface RoyaltyEntry {
  dsp: string;
  streams: number;
  earnings: number;
}

export function RoyaltyChart({ data }: { data: RoyaltyEntry[] }) {
  const maxStreams = Math.max(...data.map((d) => d.streams), 1);

  const dspColors: Record<string, string> = {
    Spotify: "bg-green-500",
    "Apple Music": "bg-pink-500",
    "Amazon Music": "bg-blue-500",
    Tidal: "bg-cyan-500",
    Deezer: "bg-purple-500",
    "YouTube Music": "bg-red-500",
  };

  return (
    <div className="space-y-3">
      {data.map((entry) => (
        <div key={entry.dsp} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-300">{entry.dsp}</span>
            <div className="flex gap-4 text-neutral-400">
              <span>{entry.streams.toLocaleString()} streams</span>
              <span className="font-medium text-white">
                ${entry.earnings.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                dspColors[entry.dsp] || "bg-neutral-500"
              )}
              style={{ width: `${(entry.streams / maxStreams) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
