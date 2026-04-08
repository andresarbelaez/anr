"use client";

import {
  lazy,
  Suspense,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  StudioMicroappSkeletonAssistant,
  StudioMicroappSkeletonCalendar,
  StudioMicroappSkeletonCrm,
  StudioMicroappSkeletonFeedback,
  StudioMicroappSkeletonLibrary,
  StudioMicroappSkeletonReleases,
  StudioMicroappSkeletonRoyalties,
  StudioMicroappSkeletonSettings,
} from "@/components/studio/ui/studio-microapp-skeletons";

/** One retry after a short delay — mobile networks sometimes drop the first dynamic import. */
function lazyStudioMicroapp(
  load: () => Promise<{ default: ComponentType<Record<string, unknown>> }>
) {
  return lazy(async () => {
    try {
      return await load();
    } catch {
      await new Promise((r) => setTimeout(r, 600));
      return await load();
    }
  });
}

function suspenseWrap(node: ReactNode, fallback: ReactNode) {
  return <Suspense fallback={fallback}>{node}</Suspense>;
}

const LazyStudioCalendarWindow = lazyStudioMicroapp(() =>
  import("@/components/studio/windows/StudioCalendarWindow").then((m) => ({
    default: m.StudioCalendarWindow,
  }))
);

const LazyStudioAssistantWindow = lazyStudioMicroapp(() =>
  import("@/components/studio/windows/StudioAssistantWindow").then((m) => ({
    default: m.StudioAssistantWindow,
  }))
);

const LazyStudioReleasesWindow = lazyStudioMicroapp(() =>
  import("@/components/studio/windows/StudioReleasesWindow").then((m) => ({
    default: m.StudioReleasesWindow,
  }))
);

const LazyStudioLibraryWindow = lazyStudioMicroapp(() =>
  import("@/components/studio/windows/StudioLibraryWindow").then((m) => ({
    default: m.StudioLibraryWindow,
  }))
);

const LazyStudioFeedbackWindow = lazyStudioMicroapp(() =>
  import("@/components/studio/windows/StudioFeedbackWindow").then((m) => ({
    default: m.StudioFeedbackWindow,
  }))
);

const LazyStudioRoyaltiesWindow = lazyStudioMicroapp(() =>
  import("@/components/studio/windows/StudioRoyaltiesWindow").then((m) => ({
    default: m.StudioRoyaltiesWindow,
  }))
);

const LazyStudioCrmWindow = lazyStudioMicroapp(() =>
  import("@/components/studio/windows/StudioCrmWindow").then((m) => ({
    default: m.StudioCrmWindow,
  }))
);

const LazyStudioSettingsWindow = lazyStudioMicroapp(() =>
  import("@/components/studio/windows/StudioSettingsWindow").then((m) => ({
    default: m.StudioSettingsWindow,
  }))
);

/** Passed into each window’s root view — extend per micro-app (e.g. CRM contact id). */
export type StudioWindowLaunchContext = {
  initialFeedbackVersionId?: string | null;
  initialReleaseId?: string | null;
  initialSongId?: string | null;
  initialContactId?: string | null;
  initialRoyaltiesReleaseId?: string | null;
};

export interface StudioWindowDef {
  title: string;
  width: number;
  height: number;
  content: (ctx: StudioWindowLaunchContext) => ReactNode;
}

export const STUDIO_WINDOWS: Record<string, StudioWindowDef> = {
  calendar: {
    title: "Calendar",
    width: 820,
    height: 600,
    content: () =>
      suspenseWrap(
        <LazyStudioCalendarWindow />,
        <StudioMicroappSkeletonCalendar />
      ),
  },
  assistant: {
    title: "sidestage-1",
    width: 640,
    height: 540,
    content: () =>
      suspenseWrap(
        <LazyStudioAssistantWindow />,
        <StudioMicroappSkeletonAssistant />
      ),
  },
  releases: {
    title: "Releases",
    width: 640,
    height: 560,
    content: (ctx) =>
      suspenseWrap(
        <LazyStudioReleasesWindow
          initialReleaseId={ctx.initialReleaseId ?? null}
        />,
        <StudioMicroappSkeletonReleases />
      ),
  },
  library: {
    title: "Library",
    width: 680,
    height: 560,
    content: (ctx) =>
      suspenseWrap(
        <LazyStudioLibraryWindow initialSongId={ctx.initialSongId ?? null} />,
        <StudioMicroappSkeletonLibrary />
      ),
  },
  feedback: {
    title: "Feedback",
    width: 600,
    height: 500,
    content: (ctx) =>
      suspenseWrap(
        <LazyStudioFeedbackWindow
          initialDetailVersionId={ctx.initialFeedbackVersionId ?? null}
        />,
        <StudioMicroappSkeletonFeedback />
      ),
  },
  royalties: {
    title: "Royalties",
    width: 560,
    height: 520,
    content: (ctx) =>
      suspenseWrap(
        <LazyStudioRoyaltiesWindow
          initialRoyaltiesReleaseId={ctx.initialRoyaltiesReleaseId ?? null}
        />,
        <StudioMicroappSkeletonRoyalties />
      ),
  },
  crm: {
    title: "CRM",
    width: 700,
    height: 560,
    content: (ctx) =>
      suspenseWrap(
        <LazyStudioCrmWindow initialContactId={ctx.initialContactId ?? null} />,
        <StudioMicroappSkeletonCrm />
      ),
  },
  settings: {
    title: "My Profile",
    width: 520,
    height: 540,
    content: () =>
      suspenseWrap(
        <LazyStudioSettingsWindow />,
        <StudioMicroappSkeletonSettings />
      ),
  },
};
