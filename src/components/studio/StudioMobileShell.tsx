"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, m, useIsPresent } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { Heart, LayoutGrid, LogOut, X } from "lucide-react";
import { StudioObject } from "@/components/studio/StudioObject";
import { StudioWindow } from "@/components/studio/StudioWindow";
import {
  StudioRoomWindowGraphic,
  StudioMobileBookshelfGraphic,
} from "@/components/studio/studio-room-graphics";
import {
  WallCalendar,
  RecordShelf,
  Typewriter,
  PiggyBank as PiggyBankWidget,
  Phonebook,
  Robot,
  StudioProfileMirror,
  VinylCrates,
} from "@/components/studio/studio-object-widgets";
import { STUDIO_WINDOWS } from "@/components/studio/studio-windows-registry";
import { getStudioActiveAppFromSearchParams } from "@/lib/studio/studio-url-app";
import { useCatalogPlayer } from "@/contexts/catalog-player-context";
import { S, PIXEL_FONT } from "@/components/studio/ui/s";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { StudioDonateModal } from "@/components/studio/StudioDonateModal";
import { StudioSignOutConfirmModal } from "@/components/studio/StudioSignOutConfirmModal";
import { MicroappAudioPlayerBar } from "@/components/audio/MicroappAudioPlayerBar";
import { studioMicroappAudioBarSharedEmbedProps } from "@/components/audio/microapp-audio-player-theme";
import { prefetchStudioMicroapp } from "@/lib/studio/prefetch-studio-microapp";

/**
 * When the user closes a micro-app we set `dismissMicroapp` in the shell. The exiting
 * `AnimatePresence` child must stop capturing touches immediately. On some mobile WebKit
 * builds `useIsPresent()` does not flip to `false` in the same frame as that state update,
 * so we also pass this boolean through context (exiting layers re-render with the parent).
 */
const StudioMobileMicroappPointerPassthroughContext = createContext(false);

/** Same pixel widgets + order as desktop room objects (4×2). */
const MOBILE_SHELF_SLOTS: {
  id: string;
  label: string;
  Widget: ComponentType;
  idle?: "breathe" | "none";
}[] = [
  { id: "releases", label: "Releases", Widget: RecordShelf },
  { id: "calendar", label: "Calendar", Widget: WallCalendar },
  { id: "feedback", label: "Feedback", Widget: Typewriter },
  { id: "my-profile", label: "My Profile", Widget: StudioProfileMirror },
  { id: "royalties", label: "Royalties", Widget: PiggyBankWidget },
  { id: "crm", label: "Contacts", Widget: Phonebook },
  { id: "assistant", label: "Assistant", Widget: Robot, idle: "breathe" },
  { id: "library", label: "Library", Widget: VinylCrates },
];

function MobileBookshelf({
  onOpenObject,
  openIds,
}: {
  onOpenObject: (id: string, anchor: HTMLElement) => void;
  openIds: ReadonlySet<string>;
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <StudioMobileBookshelfGraphic className="pointer-events-none absolute inset-0 h-full w-full" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.14) 0%, transparent 32%, transparent 68%, rgba(0,0,0,0.22) 100%)",
        }}
      />
      <p
        className="relative z-[2] shrink-0 px-4 pt-3 pb-1 text-center text-[10px] tracking-[0.2em] uppercase"
        style={{
          color: "#d4b896",
          fontFamily: PIXEL_FONT,
          textShadow: "0 1px 3px rgba(0,0,0,0.65)",
        }}
      >
        Home
      </p>
      <div className="relative z-[2] grid min-h-0 flex-1 grid-cols-2 grid-rows-4 content-center gap-y-6 px-5 pb-12 pt-1 [touch-action:manipulation] place-items-center">
        {MOBILE_SHELF_SLOTS.map(({ id, label, Widget, idle }) => (
          <StudioObject
            key={id}
            id={id}
            label={label}
            onOpen={onOpenObject}
            isOpen={openIds.has(id)}
            idle={idle ?? "none"}
            style={{
              position: "relative",
              left: "auto",
              top: "auto",
              transform: "none",
            }}
          >
            <Widget />
          </StudioObject>
        ))}
      </div>
    </div>
  );
}

/** Bookshelf-styled app switcher (FAB sheet only — not shown on home). */
function FabLauncherBookshelf({
  onOpenObject,
  openIds,
}: {
  onOpenObject: (id: string, anchor: HTMLElement) => void;
  openIds: ReadonlySet<string>;
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <StudioMobileBookshelfGraphic className="pointer-events-none absolute inset-0 h-full w-full" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.14) 0%, transparent 28%, transparent 72%, rgba(0,0,0,0.22) 100%)",
        }}
      />
      <h2
        className="relative z-[2] shrink-0 px-4 pt-1 pb-2 text-center text-[10px] tracking-[0.2em] uppercase"
        style={{
          color: "#d4b896",
          fontFamily: PIXEL_FONT,
          textShadow: "0 1px 3px rgba(0,0,0,0.65)",
        }}
      >
        Switch app
      </h2>
      <div className="relative z-[2] grid min-h-0 flex-1 grid-cols-2 grid-rows-4 content-center gap-y-5 overflow-y-auto px-5 py-2 [touch-action:manipulation] place-items-center">
        {MOBILE_SHELF_SLOTS.map(({ id, label, Widget, idle }) => (
          <StudioObject
            key={id}
            id={id}
            label={label}
            onOpen={onOpenObject}
            isOpen={openIds.has(id)}
            idle={idle ?? "none"}
            style={{
              position: "relative",
              left: "auto",
              top: "auto",
              transform: "none",
            }}
          >
            <Widget />
          </StudioObject>
        ))}
      </div>
    </div>
  );
}

/**
 * Fullscreen micro-app layer: while `AnimatePresence` runs the exit animation, the home shelf is
 * already visible (optimistic dismiss). Without `pointer-events: none` during exit, this fixed
 * panel would still eat every touch on the shelf.
 */
function StudioMobileAppFullscreenLayer({ children }: { children: ReactNode }) {
  const isPresent = useIsPresent();
  const shellRequestsPassthrough = useContext(
    StudioMobileMicroappPointerPassthroughContext
  );
  const pointerPassthrough = shellRequestsPassthrough || !isPresent;
  return (
    <m.div
      className="studio-mobile-app-layer flex flex-col overflow-hidden"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        y: 12,
        transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
      }}
      transition={{
        type: "tween",
        duration: 0.26,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        maxWidth: "100%",
        height: "100dvh",
        maxHeight: "100dvh",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
        boxSizing: "border-box",
        zIndex: 5000,
        pointerEvents: pointerPassthrough ? "none" : "auto",
      }}
    >
      {children}
    </m.div>
  );
}

export function StudioMobileShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    clearCatalogPlayer,
    activeTrack,
    playerLoading,
    playerError,
    shouldAutoplayStudioLibraryEmbed,
  } = useCatalogPlayer();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  /**
   * Hide the micro-app layer immediately on close. `router.replace("/home")` can lag
   * behind on mobile; without this, `useSearchParams` keeps `showApp` true and the home
   * shelf stays `hidden` for hundreds of ms — feels frozen. Rarely, exit + `mode="wait"`
   * could also interact badly with slow paints; dismissing first avoids that coupling.
   */
  const [dismissMicroapp, setDismissMicroapp] = useState(false);
  const homeLayerRef = useRef<HTMLDivElement>(null);

  const feedbackVersion = searchParams.get("feedbackVersion");
  const releaseId = searchParams.get("releaseId");
  const royaltiesReleaseId = searchParams.get("royaltiesReleaseId");
  const catalogSongId = searchParams.get("catalogSongId");
  const crmContactId = searchParams.get("crmContactId");

  const activeId = getStudioActiveAppFromSearchParams(searchParams);
  const def = activeId ? STUDIO_WINDOWS[activeId] : null;
  const urlWantsApp = Boolean(activeId && def);
  const showApp = urlWantsApp && !dismissMicroapp;
  const openIds =
    showApp && activeId ? new Set<string>([activeId]) : new Set<string>();

  /**
   * Never clear `dismissMicroapp` in the same turn as `activeId` becoming null: the URL can
   * update before the fullscreen `AnimatePresence` exit finishes. On some mobile WebKit builds
   * `useIsPresent()` lags, so `pointerPassthrough` would flip off while the layer still covers
   * the home shelf — taps do nothing until the exit eventually completes (felt like “many seconds”).
   * Opening an app (`activeId` truthy) clears dismiss immediately; going home debounces the reset.
   */
  useEffect(() => {
    if (activeId) {
      setDismissMicroapp(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setDismissMicroapp(false);
    }, 480);
    return () => window.clearTimeout(timer);
  }, [activeId]);

  useEffect(() => {
    if (!showApp) setLauncherOpen(false);
  }, [showApp]);

  /**
   * Opening an app hides the home shelf with `aria-hidden` while focus can still sit on the
   * tapped `StudioObject`. Chrome warns and AT users get a broken tree — blur before paint.
   */
  useLayoutEffect(() => {
    if (!showApp) return;
    const root = homeLayerRef.current;
    const ae = document.activeElement;
    if (root && ae instanceof HTMLElement && root.contains(ae)) {
      ae.blur();
    }
  }, [showApp]);

  /** Warm micro-app chunks on a timer — DevTools throttling doesn’t match flaky real LTE. */
  useEffect(() => {
    const t = window.setTimeout(() => {
      prefetchStudioMicroapp("calendar");
      prefetchStudioMicroapp("releases");
      prefetchStudioMicroapp("library");
    }, 1200);
    return () => window.clearTimeout(t);
  }, []);

  const navigateToApp = useCallback(
    (id: string) => {
      setLauncherOpen(false);
      // Do NOT clear dismissMicroapp here. If the user closes App A and immediately taps App B,
      // the URL may still have open=appA when this runs. Clearing dismiss early makes showApp flip
      // back to true for App A — briefly flashing its window bar before the new app animates in.
      // The useEffect watching activeId already clears dismissMicroapp as soon as the URL settles
      // on the new app (activeId becomes truthy).
      if (id === activeId) return;
      router.push(`/home?open=${id}`);
    },
    [router, activeId]
  );

  const handleShelfObjectOpen = useCallback(
    (id: string, _anchor: HTMLElement) => {
      navigateToApp(id);
    },
    [navigateToApp]
  );

  const closeApp = useCallback(() => {
    setDismissMicroapp(true);
    if (activeId === "library") {
      clearCatalogPlayer();
    }
    startTransition(() => {
      router.replace("/home");
    });
  }, [router, activeId, clearCatalogPlayer]);

  const performSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSignOutOpen(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <StudioMobileMicroappPointerPassthroughContext.Provider
      value={dismissMicroapp}
    >
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: "#1c1208" }}
    >
      {/*
        Keep the home header + bookshelf mounted while a micro-app is open (`display: none`).
        Closing the app then only unmounts the window — avoids multi‑second remount of 8 shelf
        widgets + SVG backdrops (React dev “long render” when returning to /home).
      */}
      <div
        ref={homeLayerRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          showApp && "hidden"
        )}
        aria-hidden={showApp}
      >
        <div
          className="relative flex shrink-0 flex-col overflow-hidden"
          style={{
            height: "25vh",
            minHeight: 148,
            background: "linear-gradient(180deg, #2a1b0f 0%, #1c1208 100%)",
            borderBottom: `1px solid ${S.border}`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 100% 88% at 50% 30%, rgba(245,208,96,0.26) 0%, transparent 54%)",
            }}
          />
          <div className="pointer-events-auto absolute top-3 right-3 z-10 flex flex-col gap-2">
            <Button
              type="button"
              variant="studioViewportSupport"
              size="sm"
              className="!text-xs"
              onClick={() => setDonateOpen(true)}
            >
              <Heart className="h-3.5 w-3.5 shrink-0" />
              Support us
            </Button>
            <Button
              type="button"
              variant="studioViewportSignOut"
              size="sm"
              className="!text-xs"
              onClick={() => setSignOutOpen(true)}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              Sign out
            </Button>
          </div>
          <div className="relative z-[1] flex flex-1 items-center justify-center py-2">
            <StudioRoomWindowGraphic className="h-[min(26vh,200px)] w-[min(78vw,280px)] drop-shadow-[0_14px_32px_rgba(0,0,0,0.5)]" />
          </div>
        </div>

        <MobileBookshelf onOpenObject={handleShelfObjectOpen} openIds={openIds} />
      </div>

      <AnimatePresence mode="popLayout">
        {showApp && def && activeId ? (
          <StudioMobileAppFullscreenLayer key={activeId}>
            <StudioWindow
              id={activeId}
              title={def.title}
              width={def.width}
              height={def.height}
              top={0}
              left={0}
              zIndex={5000}
              fullscreen
              motionRoot={false}
              chromeTopSlot={
                activeId === "library" ? (
                  <MicroappAudioPlayerBar
                    {...studioMicroappAudioBarSharedEmbedProps}
                    embeddedPlacement="top"
                    track={activeTrack}
                    loading={playerLoading}
                    error={playerError}
                    onClear={clearCatalogPlayer}
                    libraryAutoplayGate={shouldAutoplayStudioLibraryEmbed}
                    ariaLabel="Library audio player"
                  />
                ) : undefined
              }
              onClose={closeApp}
              onFocus={() => {}}
            >
              {def.content({
                initialFeedbackVersionId:
                  activeId === "feedback" ? feedbackVersion : null,
                initialReleaseId: activeId === "releases" ? releaseId : null,
                initialSongId: activeId === "library" ? catalogSongId : null,
                initialContactId: activeId === "crm" ? crmContactId : null,
                initialRoyaltiesReleaseId:
                  activeId === "royalties" ? royaltiesReleaseId : null,
              })}
            </StudioWindow>
          </StudioMobileAppFullscreenLayer>
        ) : null}
      </AnimatePresence>

      {showApp && (
        <>
          <button
            type="button"
            aria-label={launcherOpen ? "Close app menu" : "Open app menu"}
            aria-expanded={launcherOpen}
            onClick={() => setLauncherOpen((o) => !o)}
            className="touch-manipulation fixed flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition active:scale-95"
            style={{
              bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
              right: "calc(1rem + env(safe-area-inset-right, 0px))",
              zIndex: 5600,
              background: S.accent,
              color: S.accentText,
              boxShadow: `0 4px 20px rgba(0,0,0,0.35), 0 0 0 3px ${S.surface}`,
            }}
          >
            {launcherOpen ? <X className="h-6 w-6" strokeWidth={2.5} /> : <LayoutGrid className="h-6 w-6" strokeWidth={2.2} />}
          </button>

          <AnimatePresence mode="sync">
            {launcherOpen ? (
              <m.button
                key="studio-fab-scrim"
                type="button"
                aria-label="Dismiss menu"
                className="fixed inset-0 z-[5490] bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setLauncherOpen(false)}
              />
            ) : null}
            {launcherOpen ? (
              <m.div
                key="studio-fab-sheet"
                role="dialog"
                aria-modal="true"
                aria-label="Switch studio app"
                className="fixed right-0 bottom-0 left-0 z-[5510] flex max-h-[88dvh] flex-col overflow-hidden rounded-t-2xl border-t-2 shadow-2xl"
                style={{
                  background: "#1c1208",
                  borderColor: S.borderAccent,
                }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 38,
                }}
              >
                <div
                  className="mx-auto mt-2 mb-1 h-1 w-10 shrink-0 rounded-full"
                  style={{ background: "rgba(212,184,150,0.45)" }}
                />
                <div className="flex min-h-0 flex-1 flex-col">
                  <FabLauncherBookshelf
                    onOpenObject={handleShelfObjectOpen}
                    openIds={openIds}
                  />
                </div>
                <div
                  className="flex shrink-0 flex-row items-center gap-2 border-t px-3 pt-2"
                  style={{
                    borderColor: "rgba(90,56,24,0.45)",
                    paddingBottom:
                      "calc(1rem + env(safe-area-inset-bottom, 0px))",
                    paddingRight:
                      "calc(3.5rem + 1rem + 0.75rem + env(safe-area-inset-right, 0px))",
                  }}
                >
                  <Button
                    type="button"
                    variant="studioViewportSupport"
                    className="!h-10 !w-auto flex-none !justify-center gap-1.5 !px-4 !py-2 !text-xs whitespace-nowrap"
                    onClick={() => {
                      setLauncherOpen(false);
                      setDonateOpen(true);
                    }}
                  >
                    <Heart className="h-3.5 w-3.5 shrink-0" />
                    Support
                  </Button>
                  <Button
                    type="button"
                    variant="studioViewportSignOut"
                    className="!h-10 !w-auto flex-none !justify-center gap-1.5 !px-4 !py-2 !text-xs whitespace-nowrap"
                    onClick={() => {
                      setLauncherOpen(false);
                      setSignOutOpen(true);
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5 shrink-0" />
                    Sign out
                  </Button>
                </div>
              </m.div>
            ) : null}
          </AnimatePresence>
        </>
      )}

      <StudioDonateModal open={donateOpen} onClose={() => setDonateOpen(false)} />
      <StudioSignOutConfirmModal
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={performSignOut}
      />
    </div>
    </StudioMobileMicroappPointerPassthroughContext.Provider>
  );
}
