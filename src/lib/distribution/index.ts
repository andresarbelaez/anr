import { getAdapter, setAdapter, type DistributionAdapter } from "./adapter";
import { MockDistributionAdapter } from "./mock-adapter";

export type { DistributionAdapter } from "./adapter";
export type {
  SubmissionResult,
  StatusResult,
  DateRange,
  RoyaltyData,
} from "./adapter";

let initialized = false;

export function getDistributionAdapter(): DistributionAdapter {
  if (!initialized) {
    setAdapter(new MockDistributionAdapter());
    initialized = true;
  }
  return getAdapter();
}
