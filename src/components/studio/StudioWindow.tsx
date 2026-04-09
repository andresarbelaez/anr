"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { m } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  StudioWindowChromeContext,
  STUDIO_WINDOW_DEFAULT_NAV,
  type StudioWindowChromeApi,
  type StudioWindowNav,
} from "@/components/studio/studio-window-chrome";

interface Props {
  id: string;
  title: string;
  width: number;
  height: number;
  top: number;
  left: number;
  zIndex: number;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  children: ReactNode;
  /** Mobile: edge-to-edge shell (safe-area aware). */
  fullscreen?: boolean;
  /**
   * Fullscreen only: rendered above the title bar (e.g. mobile Library audio player under the notch,
   * above window chrome).
   */
  chromeTopSlot?: ReactNode;
  /**
   * When `false` with `fullscreen`, the root is a plain `div` (no motion). Use when an ancestor
   * `m.div` + `AnimatePresence` owns enter/exit (mobile shell).
   */
  motionRoot?: boolean;
}

const TITLE_BAR_H_DESKTOP = 38;
/** Fullscreen / mobile: room for ~44px touch targets (iOS HIG). */
const TITLE_BAR_H_FULLSCREEN = 52;

const chevronBtnBase: React.CSSProperties = {
  width: 26,
  height: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 3,
  border: "1px solid transparent",
  background: "transparent",
  cursor: "pointer",
  padding: 0,
  transition: "color 0.15s, background 0.15s, opacity 0.15s",
};

export function StudioWindow({
  id,
  title: defaultTitle,
  width,
  height,
  top,
  left,
  zIndex,
  onClose,
  onFocus,
  children,
  fullscreen = false,
  chromeTopSlot,
  motionRoot = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [nav, setNavState] = useState<StudioWindowNav>(
    STUDIO_WINDOW_DEFAULT_NAV
  );

  const displayTitle = titleOverride ?? defaultTitle;
  const titleBarH = fullscreen ? TITLE_BAR_H_FULLSCREEN : TITLE_BAR_H_DESKTOP;
  const chevronHit = fullscreen ? 44 : 26;
  const chevronIconSize = fullscreen ? 22 : 18;
  const chevronStroke = fullscreen ? 2.5 : 2.2;

  const resetChrome = useCallback(() => {
    setTitleOverride(null);
    setNavState(STUDIO_WINDOW_DEFAULT_NAV);
  }, []);

  const api = useMemo<StudioWindowChromeApi>(
    () => ({
      setTitle: setTitleOverride,
      setNav: setNavState,
      resetChrome,
    }),
    [resetChrome]
  );

  const body = (
    <StudioWindowChromeContext.Provider value={api}>
        {fullscreen && chromeTopSlot ? (
          <div style={{ flexShrink: 0 }}>{chromeTopSlot}</div>
        ) : null}
        {/* ── Title bar ── */}
        <div
          style={{
            height: titleBarH,
            minHeight: titleBarH,
            background: "#ede0cc",
            borderBottom: "1px solid #d4b896",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingInline: 8,
            cursor: "default",
            flexShrink: 0,
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: fullscreen ? 4 : 2,
              alignItems: "center",
            }}
          >
            <button
              type="button"
              aria-label="Back"
              disabled={!nav.canBack}
              onClick={(e) => {
                e.stopPropagation();
                if (nav.canBack) nav.goBack();
              }}
              style={{
                ...chevronBtnBase,
                width: chevronHit,
                height: chevronHit,
                ...(fullscreen
                  ? { minWidth: 44, minHeight: 44 }
                  : {}),
                color: nav.canBack ? "#5a3518" : "#b89070",
                opacity: nav.canBack ? 1 : 0.45,
                cursor: nav.canBack ? "pointer" : "default",
              }}
              onMouseEnter={(e) => {
                if (!nav.canBack) return;
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(168,92,16,0.10)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
              }}
            >
              <ChevronLeft size={chevronIconSize} strokeWidth={chevronStroke} />
            </button>
            <button
              type="button"
              aria-label="Forward"
              disabled={!nav.canForward}
              onClick={(e) => {
                e.stopPropagation();
                if (nav.canForward) nav.goForward();
              }}
              style={{
                ...chevronBtnBase,
                width: chevronHit,
                height: chevronHit,
                ...(fullscreen
                  ? { minWidth: 44, minHeight: 44 }
                  : {}),
                color: nav.canForward ? "#5a3518" : "#b89070",
                opacity: nav.canForward ? 1 : 0.45,
                cursor: nav.canForward ? "pointer" : "default",
              }}
              onMouseEnter={(e) => {
                if (!nav.canForward) return;
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(168,92,16,0.10)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
              }}
            >
              <ChevronRight size={chevronIconSize} strokeWidth={chevronStroke} />
            </button>
          </div>

          <span
            style={{
              fontFamily: "var(--font-pixel, ui-monospace, monospace)",
              fontSize: 8,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#5a3518",
              flex: 1,
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              paddingInline: 4,
            }}
            title={displayTitle}
          >
            {displayTitle}
          </span>

          <button
            type="button"
            onClick={() => onClose(id)}
            aria-label={`Close ${displayTitle}`}
            style={{
              width: fullscreen ? 44 : 22,
              height: fullscreen ? 44 : 22,
              minWidth: fullscreen ? 44 : undefined,
              minHeight: fullscreen ? 44 : undefined,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 3,
              border: "1px solid transparent",
              background: "transparent",
              cursor: "pointer",
              color: "#8a6040",
              flexShrink: 0,
              transition: "color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#a85c10";
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(168,92,16,0.10)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#8a6040";
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
          >
            <X
              size={fullscreen ? 22 : 12}
              strokeWidth={fullscreen ? 2.6 : 2.5}
            />
          </button>
        </div>

        {/* ── Content area ── */}
        <div
          style={{
            flex: 1,
            /* Hidden so embedded micro-apps get a definite height; each app scrolls internally. */
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {children}
        </div>
    </StudioWindowChromeContext.Provider>
  );

  if (fullscreen && !motionRoot) {
    return (
      <div
        ref={ref}
        onPointerDown={() => onFocus(id)}
        className="studio-window-mobile-inner flex min-h-0 flex-1 flex-col overflow-hidden bg-[#fdf8f0]"
      >
        {body}
      </div>
    );
  }

  return (
    <m.div
      ref={ref}
      initial={fullscreen ? false : { scale: 0.88, opacity: 0, y: -6 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.88, opacity: 0, y: -6, transition: { duration: 0.15 } }}
      transition={
        fullscreen
          ? { duration: 0.15, ease: "easeOut" }
          : { type: "spring", stiffness: 380, damping: 30 }
      }
      onMouseDown={() => onFocus(id)}
      style={{
        position: "fixed",
        ...(fullscreen
          ? {
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
              borderRadius: 0,
            }
          : {
              top,
              left,
              width,
              maxWidth: `calc(100vw - 240px)`,
              height,
              maxHeight: `calc(100vh - 20px)`,
              borderRadius: 4,
            }),
        zIndex,
        display: "flex",
        flexDirection: "column",
        border: fullscreen ? "none" : "2px solid #8c5c32",
        boxShadow: fullscreen
          ? "none"
          : "4px 4px 0 rgba(100,50,10,0.30), inset 0 0 0 1px rgba(140,92,50,0.12)",
        background: "#fdf8f0",
        overflow: "hidden",
      }}
    >
      {body}
    </m.div>
  );
}
