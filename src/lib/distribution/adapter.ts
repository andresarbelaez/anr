import type { Release, Track, ReleaseStatus } from "@/lib/supabase/types";

export interface SubmissionResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface StatusResult {
  status: ReleaseStatus;
  details?: string;
  updatedAt: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface RoyaltyData {
  entries: {
    dsp: string;
    period: string;
    streams: number;
    earnings: number;
    currency: string;
  }[];
  totalEarnings: number;
  totalStreams: number;
}

export interface DistributionAdapter {
  submitRelease(release: Release, tracks: Track[]): Promise<SubmissionResult>;
  getStatus(releaseId: string): Promise<StatusResult>;
  getRoyalties(releaseId: string, period: DateRange): Promise<RoyaltyData>;
}

let currentAdapter: DistributionAdapter | null = null;

export function setAdapter(adapter: DistributionAdapter) {
  currentAdapter = adapter;
}

export function getAdapter(): DistributionAdapter {
  if (!currentAdapter) {
    throw new Error(
      "Distribution adapter not configured. Call setAdapter() first."
    );
  }
  return currentAdapter;
}
