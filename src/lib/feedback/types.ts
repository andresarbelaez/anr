export type PublicFeedbackReplyJson = {
  id: string;
  body: string;
  displayName: string | null;
  createdAt: string;
};

export type PublicFeedbackRootJson = PublicFeedbackReplyJson & {
  secondsIntoTrack: number;
  replies: PublicFeedbackReplyJson[];
};

export type PublicFeedbackSessionJson = {
  songTitle: string;
  versionLabel: string;
  /** Artist display name (profiles.artist_name) for public copy */
  artistName: string;
  audioUrl: string;
  audioUrlExpiresInSec: number;
  comments: PublicFeedbackRootJson[];
};

/** `GET .../bootstrap` — metadata + signed audio URL only (fast path). */
export type PublicFeedbackBootstrapJson = {
  songTitle: string;
  versionLabel: string;
  artistName: string;
  audioUrl: string;
  audioUrlExpiresInSec: number;
};

/** `GET .../comments` — threaded comments only. */
export type PublicFeedbackCommentsJson = {
  comments: PublicFeedbackRootJson[];
};
