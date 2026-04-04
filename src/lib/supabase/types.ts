export type ReleaseStatus =
  | "draft"
  | "submitted"
  | "processing"
  | "live"
  | "rejected";

export type ReleaseType = "single" | "ep" | "album";

export type ContributorRole =
  | "primary_artist"
  | "featured_artist"
  | "producer"
  | "songwriter"
  | "composer"
  | "mixer"
  | "mastering_engineer";

export interface Profile {
  id: string;
  artist_name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  instagram: string | null;
  twitter: string | null;
  spotify_url: string | null;
  apple_music_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Release {
  id: string;
  user_id: string;
  title: string;
  type: ReleaseType;
  cover_art_url: string | null;
  upc: string | null;
  release_date: string | null;
  status: ReleaseStatus;
  genre: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: string;
  release_id: string;
  title: string;
  track_number: number;
  isrc: string | null;
  wav_url: string | null;
  duration_seconds: number | null;
  genre: string | null;
  explicit: boolean;
  created_at: string;
}

export interface Contributor {
  id: string;
  track_id: string;
  name: string;
  role: ContributorRole;
}

export interface Royalty {
  id: string;
  release_id: string;
  dsp_name: string;
  period: string;
  stream_count: number;
  earnings_amount: number;
  currency: string;
  created_at: string;
}

export interface Donation {
  id: string;
  donor_name: string | null;
  donor_email: string | null;
  amount: number;
  currency: string;
  stripe_payment_id: string;
  message: string | null;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Database {}
