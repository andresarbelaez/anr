"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
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
}

const TITLE_BAR_H = 38;

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
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [nav, setNavState] = useState<StudioWindowNav>(
    STUDIO_WINDOW_DEFAULT_NAV
  );

  const displayTitle = titleOverride ?? defaultTitle;

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

  return (
    <motion.div
      ref={ref}
      key={id}
      initial={{ scale: 0.88, opacity: 0, y: -6 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.88, opacity: 0, y: -6, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      onMouseDown={() => onFocus(id)}
      style={{
        position: "fixed",
        top,
        left,
        width,
        maxWidth: `calc(100vw - 240px)`,
        height,
        maxHeight: `calc(100vh - 20px)`,
        zIndex,
        display: "flex",
        flexDirection: "column",
        border: "2px solid #8c5c32",
        boxShadow:
          "4px 4px 0 rgba(100,50,10,0.30), inset 0 0 0 1px rgba(140,92,50,0.12)",
        borderRadius: 4,
        background: "#fdf8f0",
        overflow: "hidden",
      }}
    >
      <StudioWindowChromeContext.Provider value={api}>
        {/* ── Title bar ── */}
        <div
          style={{
            height: TITLE_BAR_H,
            minHeight: TITLE_BAR_H,
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
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
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
              <ChevronLeft size={18} strokeWidth={2.2} />
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
              <ChevronRight size={18} strokeWidth={2.2} />
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
              width: 22,
              height: 22,
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
            <X size={12} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Content area ── */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {children}
        </div>
      </StudioWindowChromeContext.Provider>
    </motion.div>
  );
}
