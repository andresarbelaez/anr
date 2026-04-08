"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type {
  CalendarEvent,
  CatalogSong,
  CatalogSongVersion,
  CrmContact,
  Release,
  ReleaseStatus,
  Royalty,
} from "@/lib/supabase/types";

/** In-memory only; cleared when the tab is closed or full reload. */
export const STUDIO_SESSION_CACHE_LIMITS = {
  releases: 45,
  librarySongs: 45,
  versionsPerSong: 24,
  crmContacts: 45,
  feedbackRows: 30,
  royaltyLineItems: 2500,
  calendarEvents: 280,
  calendarReleases: 120,
} as const;

export type StudioCachedLibrarySong = CatalogSong & {
  releaseTitle: string | null;
};

export type StudioCachedCrmCollab = {
  kind: "release" | "catalog";
  id: string;
  label: string;
  note: string | null;
};

export type StudioCachedFeedbackRow = {
  versionId: string;
  songTitle: string;
  versionLabel: string;
  enabled: boolean;
  commentCount: number;
};

export type StudioCachedCalendarRelease = {
  id: string;
  title: string;
  release_date: string;
  status: ReleaseStatus;
};

type LibrarySnapshot = {
  songs: StudioCachedLibrarySong[];
  versionsBySong: Record<string, CatalogSongVersion[]>;
};

type CrmSnapshot = {
  contacts: CrmContact[];
  collabsByContactId: Record<string, StudioCachedCrmCollab[]>;
};

type CalendarSnapshot = {
  events: CalendarEvent[];
  releases: StudioCachedCalendarRelease[];
};

type Store = {
  /** `loaded` distinguishes “fetched (maybe empty)” from “never opened this session”. */
  releases: { loaded: boolean; items: Release[] };
  library: { loaded: boolean } & LibrarySnapshot;
  crm: { loaded: boolean } & CrmSnapshot;
  feedback: { loaded: boolean; rows: StudioCachedFeedbackRow[] };
  royalties: {
    loaded: boolean;
    releases: Release[];
    royalties: Royalty[];
  };
  /** view + ISO range */
  calendarByKey: Map<string, CalendarSnapshot>;
};

function trimReleases(rows: Release[]): Release[] {
  return rows.slice(0, STUDIO_SESSION_CACHE_LIMITS.releases);
}

function trimLibrary(
  songs: StudioCachedLibrarySong[],
  versionsBySong: Record<string, CatalogSongVersion[]>
): LibrarySnapshot {
  const cap = STUDIO_SESSION_CACHE_LIMITS.librarySongs;
  const top = songs.slice(0, cap);
  const vCap = STUDIO_SESSION_CACHE_LIMITS.versionsPerSong;
  const nextVers: Record<string, CatalogSongVersion[]> = {};
  for (const s of top) {
    const v = versionsBySong[s.id] ?? [];
    nextVers[s.id] = v.slice(0, vCap);
  }
  return { songs: top, versionsBySong: nextVers };
}

function trimCrm(
  contacts: CrmContact[],
  collabsByContactId: Record<string, StudioCachedCrmCollab[]>
): CrmSnapshot {
  const top = contacts.slice(0, STUDIO_SESSION_CACHE_LIMITS.crmContacts);
  const next: Record<string, StudioCachedCrmCollab[]> = {};
  for (const c of top) {
    next[c.id] = collabsByContactId[c.id] ?? [];
  }
  return { contacts: top, collabsByContactId: next };
}

export type StudioMicroappSessionCacheApi = {
  takeReleases: () => Release[] | null;
  putReleases: (rows: Release[]) => void;
  takeLibrary: () => LibrarySnapshot | null;
  putLibrary: (
    songs: StudioCachedLibrarySong[],
    versionsBySong: Record<string, CatalogSongVersion[]>
  ) => void;
  takeCrm: () => CrmSnapshot | null;
  putCrm: (
    contacts: CrmContact[],
    collabsByContactId: Record<string, StudioCachedCrmCollab[]>
  ) => void;
  takeFeedback: () => StudioCachedFeedbackRow[] | null;
  putFeedback: (rows: StudioCachedFeedbackRow[]) => void;
  takeRoyalties: () => { releases: Release[]; royalties: Royalty[] } | null;
  putRoyalties: (releases: Release[], royalties: Royalty[]) => void;
  takeCalendar: (key: string) => CalendarSnapshot | null;
  putCalendar: (key: string, snap: CalendarSnapshot) => void;
};

export const StudioMicroappSessionCacheContext =
  createContext<StudioMicroappSessionCacheApi | null>(null);

/** Returns `null` outside the studio shell (e.g. dashboard calendar page). */
export function useStudioMicroappSessionCacheOptional(): StudioMicroappSessionCacheApi | null {
  return useContext(StudioMicroappSessionCacheContext);
}

export function StudioMicroappSessionCacheProvider({
  children,
}: {
  children: ReactNode;
}) {
  const ref = useRef<Store>({
    releases: { loaded: false, items: [] },
    library: { loaded: false, songs: [], versionsBySong: {} },
    crm: { loaded: false, contacts: [], collabsByContactId: {} },
    feedback: { loaded: false, rows: [] },
    royalties: { loaded: false, releases: [], royalties: [] },
    calendarByKey: new Map(),
  });

  const api = useMemo<StudioMicroappSessionCacheApi>(
    () => ({
      takeReleases: () =>
        ref.current.releases.loaded ? ref.current.releases.items : null,
      putReleases: (rows) => {
        ref.current.releases = {
          loaded: true,
          items: trimReleases(rows),
        };
      },
      takeLibrary: () =>
        ref.current.library.loaded
          ? {
              songs: ref.current.library.songs,
              versionsBySong: ref.current.library.versionsBySong,
            }
          : null,
      putLibrary: (songs, versionsBySong) => {
        const t = trimLibrary(songs, versionsBySong);
        ref.current.library = { loaded: true, ...t };
      },
      takeCrm: () =>
        ref.current.crm.loaded
          ? {
              contacts: ref.current.crm.contacts,
              collabsByContactId: ref.current.crm.collabsByContactId,
            }
          : null,
      putCrm: (contacts, collabsByContactId) => {
        const t = trimCrm(contacts, collabsByContactId);
        ref.current.crm = { loaded: true, ...t };
      },
      takeFeedback: () =>
        ref.current.feedback.loaded ? ref.current.feedback.rows : null,
      putFeedback: (rows) => {
        ref.current.feedback = {
          loaded: true,
          rows: rows.slice(0, STUDIO_SESSION_CACHE_LIMITS.feedbackRows),
        };
      },
      takeRoyalties: () =>
        ref.current.royalties.loaded
          ? {
              releases: ref.current.royalties.releases,
              royalties: ref.current.royalties.royalties,
            }
          : null,
      putRoyalties: (releases, royalties) => {
        ref.current.royalties = {
          loaded: true,
          releases,
          royalties: royalties.slice(
            0,
            STUDIO_SESSION_CACHE_LIMITS.royaltyLineItems
          ),
        };
      },
      takeCalendar: (key) => ref.current.calendarByKey.get(key) ?? null,
      putCalendar: (key, snap) => {
        ref.current.calendarByKey.set(key, {
          events: snap.events.slice(0, STUDIO_SESSION_CACHE_LIMITS.calendarEvents),
          releases: snap.releases.slice(
            0,
            STUDIO_SESSION_CACHE_LIMITS.calendarReleases
          ),
        });
        if (ref.current.calendarByKey.size > 12) {
          const first = ref.current.calendarByKey.keys().next().value;
          if (first !== undefined) ref.current.calendarByKey.delete(first);
        }
      },
    }),
    []
  );

  return (
    <StudioMicroappSessionCacheContext.Provider value={api}>
      {children}
    </StudioMicroappSessionCacheContext.Provider>
  );
}


/** Calendar range key — stable for same view + visible window. */
export function studioCalendarSessionKey(
  view: "month" | "week",
  rangeStart: Date,
  rangeEnd: Date
): string {
  return `${view}:${rangeStart.toISOString()}:${rangeEnd.toISOString()}`;
}
