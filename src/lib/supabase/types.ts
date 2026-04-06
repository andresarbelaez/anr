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

export interface CatalogSong {
  id: string;
  user_id: string;
  title: string;
  release_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogSongVersion {
  id: string;
  catalog_song_id: string;
  label: string | null;
  storage_path: string;
  file_name: string;
  created_at: string;
}

export interface FeedbackVersionLink {
  id: string;
  catalog_song_version_id: string;
  token: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedbackComment {
  id: string;
  feedback_link_id: string;
  parent_id: string | null;
  body: string;
  seconds_into_track: number | null;
  display_name: string | null;
  giver_secret: string;
  created_at: string;
}

export interface CrmContact {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  instagram: string | null;
  tiktok: string | null;
  role: string | null;
  notes: string | null;
  last_contacted_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CrmContactCollaboration {
  id: string;
  contact_id: string;
  release_id: string | null;
  catalog_song_id: string | null;
  note: string | null;
  created_at: string;
}

export interface AgentThread {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentMessage {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "tool";
  content: string | null;
  tool_calls: unknown | null;
  tool_call_id: string | null;
  attachments: AgentAttachmentRef[];
  created_at: string;
}

export type AgentAttachmentRef = {
  path: string;
  mimeType: string;
  kind: "image" | "audio" | "csv";
  name?: string;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Database {}

// ---- Calendar ----

export type CalendarColorKey =
  | "default"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink";

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  /** Repeat every N units (e.g. 2 = every 2 weeks). Default 1. */
  interval: number;
  /** For weekly: days of week to fire on. 0=Sun … 6=Sat. */
  days_of_week?: number[];
  /** Inclusive last date (YYYY-MM-DD). Null = no end. */
  end_date?: string;
  /** Max occurrences. Null = unlimited. */
  count?: number;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  /** ISO timestamptz, or ISO date string when all_day=true */
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: CalendarColorKey;
  location: string | null;
  link: string | null;
  recurrence: RecurrenceRule | null;
  /** Non-null = this is an exception to a recurring series */
  recurrence_parent_id: string | null;
  recurrence_original_date: string | null;
  is_exception_cancelled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarOccurrence {
  /** Unique render key: `${masterId}:${occurrenceDate}` for recurring, `${id}` for single */
  key: string;
  masterId: string;
  /** YYYY-MM-DD of this specific occurrence */
  occurrenceDate: string;
  startAt: Date;
  endAt: Date | null;
  /** Inclusive day count: 1 for same-day events */
  durationDays: number;
  /** Exception event if modified, otherwise master */
  event: CalendarEvent;
  isRecurring: boolean;
  isCancelled: boolean;
  /** Read-only release date synthesised from releases table */
  isReleaseDate?: boolean;
}
