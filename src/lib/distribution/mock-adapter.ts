import type {
  DistributionAdapter,
  SubmissionResult,
  StatusResult,
  DateRange,
  RoyaltyData,
} from "./adapter";
import type { Release, Track, ReleaseStatus } from "@/lib/supabase/types";

const DSPS = [
  "Spotify",
  "Apple Music",
  "Amazon Music",
  "Tidal",
  "Deezer",
  "YouTube Music",
];

const releaseStates = new Map<
  string,
  { status: ReleaseStatus; submittedAt: number }
>();

export class MockDistributionAdapter implements DistributionAdapter {
  async submitRelease(
    release: Release,
    _tracks: Track[]
  ): Promise<SubmissionResult> {
    await delay(500);

    if (Math.random() < 0.05) {
      return {
        success: false,
        error: "Simulated validation failure: cover art resolution too low",
      };
    }

    releaseStates.set(release.id, {
      status: "submitted",
      submittedAt: Date.now(),
    });

    return {
      success: true,
      externalId: `mock-${release.id.slice(0, 8)}-${Date.now()}`,
    };
  }

  async getStatus(releaseId: string): Promise<StatusResult> {
    await delay(200);

    const state = releaseStates.get(releaseId);
    if (!state) {
      return {
        status: "draft",
        details: "Not yet submitted for distribution",
        updatedAt: new Date().toISOString(),
      };
    }

    const elapsed = Date.now() - state.submittedAt;
    let status: ReleaseStatus;
    let details: string;

    if (elapsed < 10_000) {
      status = "submitted";
      details = "Queued for processing";
    } else if (elapsed < 30_000) {
      status = "processing";
      details = "Validating metadata and audio files";
    } else {
      status = "live";
      details = `Distributed to ${DSPS.length} platforms`;
    }

    return {
      status,
      details,
      updatedAt: new Date().toISOString(),
    };
  }

  async getRoyalties(
    _releaseId: string,
    period: DateRange
  ): Promise<RoyaltyData> {
    await delay(300);

    const entries = DSPS.map((dsp) => {
      const streams = Math.floor(Math.random() * 10000);
      const ratePerStream = 0.003 + Math.random() * 0.005;
      return {
        dsp,
        period: `${period.start} to ${period.end}`,
        streams,
        earnings: Math.round(streams * ratePerStream * 100) / 100,
        currency: "USD",
      };
    });

    return {
      entries,
      totalStreams: entries.reduce((sum, e) => sum + e.streams, 0),
      totalEarnings:
        Math.round(entries.reduce((sum, e) => sum + e.earnings, 0) * 100) / 100,
    };
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
