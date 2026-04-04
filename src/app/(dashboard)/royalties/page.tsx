"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RoyaltyChart } from "@/components/dashboard/RoyaltyChart";
import type { Royalty, Release } from "@/lib/supabase/types";

interface AggregatedDsp {
  dsp: string;
  streams: number;
  earnings: number;
}

export default function RoyaltiesPage() {
  const [royalties, setRoyalties] = useState<Royalty[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: rels } = await supabase
        .from("releases")
        .select("*")
        .eq("status", "live");

      setReleases((rels as Release[]) || []);

      const { data: roys } = await supabase
        .from("royalties")
        .select("*")
        .order("created_at", { ascending: false });

      setRoyalties((roys as Royalty[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const aggregatedByDsp: AggregatedDsp[] = Object.values(
    royalties.reduce<Record<string, AggregatedDsp>>((acc, r) => {
      if (!acc[r.dsp_name]) {
        acc[r.dsp_name] = { dsp: r.dsp_name, streams: 0, earnings: 0 };
      }
      acc[r.dsp_name].streams += r.stream_count;
      acc[r.dsp_name].earnings += Number(r.earnings_amount);
      return acc;
    }, {})
  ).sort((a, b) => b.earnings - a.earnings);

  const totalEarnings = aggregatedByDsp.reduce(
    (sum, d) => sum + d.earnings,
    0
  );
  const totalStreams = aggregatedByDsp.reduce((sum, d) => sum + d.streams, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Royalties</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Track your streaming earnings across platforms
      </p>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <DollarSign className="h-4 w-4" />
                Total Earnings
              </div>
              <p className="mt-2 text-2xl font-bold text-white">
                ${totalEarnings.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <TrendingUp className="h-4 w-4" />
                Total Streams
              </div>
              <p className="mt-2 text-2xl font-bold text-white">
                {totalStreams.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <BarChart3 className="h-4 w-4" />
                Live Releases
              </div>
              <p className="mt-2 text-2xl font-bold text-white">
                {releases.length}
              </p>
            </div>
          </div>

          {aggregatedByDsp.length > 0 ? (
            <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h2 className="mb-6 text-sm font-medium uppercase tracking-wider text-neutral-500">
                Earnings by platform
              </h2>
              <RoyaltyChart data={aggregatedByDsp} />
            </div>
          ) : (
            <div className="mt-16 text-center">
              <p className="text-neutral-400">
                No royalty data yet. Earnings will appear here once your
                releases start streaming.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
