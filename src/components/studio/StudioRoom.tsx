"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import { StudioDesktopRoom } from "@/components/studio/StudioDesktopRoom";
import { StudioMobileShell } from "@/components/studio/StudioMobileShell";
import { StudioMicroappSessionCacheProvider } from "@/contexts/studio-microapp-session-cache";
import { useStudioMobileLayout } from "@/lib/studio/use-studio-mobile-layout";

export type { StudioWindowLaunchContext } from "@/components/studio/studio-windows-registry";

export function StudioRoom({
  serverMobileHint,
}: {
  /** When `true`, SSR matches typical phones so reload isn’t stuck on an empty brown frame. */
  serverMobileHint?: true;
} = {}) {
  const mobile = useStudioMobileLayout(serverMobileHint);

  const inner =
    mobile === undefined ? (
      <div
        className="flex h-full min-h-[100vh] w-full flex-col items-center justify-center gap-3 bg-[#1c1208] px-6"
        aria-busy="true"
        aria-label="Loading studio"
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[#5a3518] border-t-[#d4b896]"
          aria-hidden
        />
        <span
          className="text-center text-[10px] uppercase tracking-[0.25em] text-[#8a6040]"
          style={{ fontFamily: "var(--font-pixel, ui-monospace, monospace)" }}
        >
          Loading studio…
        </span>
      </div>
    ) : (
      <StudioMicroappSessionCacheProvider>
        {mobile ? <StudioMobileShell /> : <StudioDesktopRoom />}
      </StudioMicroappSessionCacheProvider>
    );

  return (
    <LazyMotion features={domAnimation} strict>
      {inner}
    </LazyMotion>
  );
}
