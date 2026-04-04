"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Music } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ReleaseCard } from "@/components/dashboard/ReleaseCard";
import type { Release } from "@/lib/supabase/types";

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("releases")
        .select("*")
        .order("created_at", { ascending: false });

      setReleases((data as Release[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Releases</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Manage your music releases
          </p>
        </div>
        <Link href="/releases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Release
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
        </div>
      ) : releases.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900">
            <Music className="h-8 w-8 text-neutral-600" />
          </div>
          <h2 className="mt-4 text-lg font-medium text-white">
            No releases yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-neutral-400">
            Upload your first track and distribute it to Spotify, Apple Music,
            and 150+ other platforms — completely free.
          </p>
          <Link href="/releases/new" className="mt-6">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create your first release
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {releases.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      )}
    </div>
  );
}
