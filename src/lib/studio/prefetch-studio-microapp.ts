/**
 * Warm the same dynamic chunks as `studio-windows-registry` when the user touches
 * a shelf object — often loaded before navigation + Suspense paint.
 */

const MICROAPP_IMPORTS: Record<string, () => Promise<unknown>> = {
  calendar: () => import("@/components/studio/windows/StudioCalendarWindow"),
  assistant: () => import("@/components/studio/windows/StudioAssistantWindow"),
  releases: () => import("@/components/studio/windows/StudioReleasesWindow"),
  library: () => import("@/components/studio/windows/StudioLibraryWindow"),
  feedback: () => import("@/components/studio/windows/StudioFeedbackWindow"),
  royalties: () => import("@/components/studio/windows/StudioRoyaltiesWindow"),
  crm: () => import("@/components/studio/windows/StudioCrmWindow"),
  settings: () => import("@/components/studio/windows/StudioSettingsWindow"),
};

export function prefetchStudioMicroapp(id: string): void {
  const load = MICROAPP_IMPORTS[id];
  if (load) void load();
}
