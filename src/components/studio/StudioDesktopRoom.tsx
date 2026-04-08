"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";

import { StudioObject } from "./StudioObject";
import { StudioWindow } from "./StudioWindow";
import { positionWindow } from "@/lib/studio/positionWindow";
import { STUDIO_WINDOWS } from "@/components/studio/studio-windows-registry";
import { useCatalogPlayer } from "@/contexts/catalog-player-context";
import { StudioViewportActions } from "@/components/studio/StudioViewportActions";
import {
  WallCalendar,
  RecordShelf,
  Typewriter,
  PiggyBank,
  Phonebook,
  Robot,
  BenchWrench,
  VinylCrates,
} from "@/components/studio/studio-object-widgets";

function centerViewportAnchor(): DOMRect {
  if (typeof window === "undefined") {
    return new DOMRect(0, 0, 0, 0);
  }
  const x = window.innerWidth / 2;
  const y = window.innerHeight / 2;
  return new DOMRect(x, y, 0, 0);
}

export function StudioDesktopRoom() {
  const { clearCatalogPlayer } = useCatalogPlayer();
  const searchParams = useSearchParams();
  const feedbackVersion = searchParams.get("feedbackVersion");
  const releaseId = searchParams.get("releaseId");
  const royaltiesReleaseId = searchParams.get("royaltiesReleaseId");
  const catalogSongId = searchParams.get("catalogSongId");
  const crmContactId = searchParams.get("crmContactId");
  const openPanel = searchParams.get("open");

  const [openWindows, setOpenWindows] = useState<Map<string, DOMRect>>(new Map());
  const [windowOrder, setWindowOrder] = useState<string[]>([]);

  const openWindowAtCenter = useCallback((id: string) => {
    const anchor = centerViewportAnchor();
    setOpenWindows((prev) => {
      const next = new Map(prev);
      if (!next.has(id)) next.set(id, anchor);
      return next;
    });
    setWindowOrder((prev) =>
      prev.includes(id) ? [...prev.filter((x) => x !== id), id] : [...prev, id]
    );
  }, []);

  const autoOpenedKey = useRef<string | null>(null);
  useEffect(() => {
    let key: string | null = null;
    let windowId: string | null = null;
    if (feedbackVersion) {
      key = `feedbackVersion:${feedbackVersion}`;
      windowId = "feedback";
    } else if (crmContactId) {
      key = `crmContactId:${crmContactId}`;
      windowId = "crm";
    } else if (catalogSongId) {
      key = `catalogSongId:${catalogSongId}`;
      windowId = "library";
    } else if (royaltiesReleaseId) {
      key = `royaltiesReleaseId:${royaltiesReleaseId}`;
      windowId = "royalties";
    } else if (releaseId) {
      key = `releaseId:${releaseId}`;
      windowId = "releases";
    } else if (
      openPanel === "feedback" ||
      openPanel === "library" ||
      openPanel === "releases" ||
      openPanel === "crm" ||
      openPanel === "royalties" ||
      openPanel === "assistant" ||
      openPanel === "calendar" ||
      openPanel === "settings"
    ) {
      key = `open:${openPanel}`;
      windowId = openPanel;
    }
    if (!key || !windowId || autoOpenedKey.current === key) return;
    autoOpenedKey.current = key;
    openWindowAtCenter(windowId);
  }, [
    feedbackVersion,
    crmContactId,
    catalogSongId,
    royaltiesReleaseId,
    releaseId,
    openPanel,
    openWindowAtCenter,
  ]);

  const handleOpen = useCallback((id: string, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect();
    setOpenWindows((prev) => {
      const next = new Map(prev);
      if (!next.has(id)) next.set(id, rect);
      return next;
    });
    setWindowOrder((prev) =>
      prev.includes(id) ? [...prev.filter((x) => x !== id), id] : [...prev, id]
    );
  }, []);

  const handleClose = useCallback(
    (id: string) => {
      if (id === "library") {
        clearCatalogPlayer();
      }
      setOpenWindows((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      setWindowOrder((prev) => prev.filter((x) => x !== id));
    },
    [clearCatalogPlayer]
  );

  const handleFocus = useCallback((id: string) => {
    setWindowOrder((prev) => [...prev.filter((x) => x !== id), id]);
  }, []);

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 660"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="windowGlow" cx="883" cy="230" r="560" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f5d060" stopOpacity="0.28" />
            <stop offset="35%" stopColor="#f5c840" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#f5c840" stopOpacity="0" />
          </radialGradient>
          <pattern id="ceilPlanks" x="0" y="0" width="26" height="200" patternUnits="userSpaceOnUse">
            <rect width="26" height="200" fill="#6a4020" />
            <rect x="25" y="0" width="1" height="200" fill="#3a2008" opacity="0.88" />
            <rect x="0" y="95" width="26" height="1" fill="#8a5828" opacity="0.18" />
          </pattern>
          <linearGradient id="ceilShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0.52" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.10" />
          </linearGradient>
          <pattern id="woodPlanks" x="0" y="0" width="200" height="20" patternUnits="userSpaceOnUse">
            <rect width="200" height="20" fill="#7a4e29" />
            <rect y="19" width="200" height="1" fill="#5a3818" opacity="0.8" />
            <rect x="100" y="0" width="1" height="20" fill="#6a4020" opacity="0.25" />
          </pattern>
          <radialGradient id="wallAmbient" cx="500" cy="260" r="280" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a07840" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#a07840" stopOpacity="0" />
          </radialGradient>
        </defs>

        <polygon points="0,0 1000,0 1000,100 738,10 262,10 0,100" fill="url(#ceilPlanks)" />
        <polygon points="0,0 1000,0 1000,100 738,10 262,10 0,100" fill="url(#ceilShade)" />
        <rect x="262" y="10" width="476" height="472" fill="#2a1b0f" />
        <rect x="262" y="10" width="476" height="472" fill="url(#wallAmbient)" />
        <polygon points="0,100 262,10 262,482 0,558" fill="#1c1208" />
        <polygon points="738,10 1000,100 1000,558 738,482" fill="#1c1208" />
        <polygon points="0,558 262,482 738,482 1000,558 1000,660 0,660" fill="url(#woodPlanks)" />
        <rect x="0" y="0" width="1000" height="660" fill="url(#windowGlow)" />

        <line x1="262" y1="10" x2="262" y2="482" stroke="#0c0703" strokeWidth="3" />
        <line x1="738" y1="10" x2="738" y2="482" stroke="#0c0703" strokeWidth="3" />
        <rect x="262" y="475" width="476" height="7" fill="#180c05" opacity="0.9" />
        <polygon points="0,554 262,475 262,482 0,558" fill="#180c05" opacity="0.55" />
        <polygon points="738,475 1000,554 1000,558 738,482" fill="#180c05" opacity="0.55" />
        <rect x="262" y="270" width="476" height="4" fill="#1a0e06" opacity="0.55" />
        <rect x="262" y="274" width="476" height="1" fill="#c09050" opacity="0.12" />

        {Array.from({ length: 8 }, (_, i) => {
          const y = 516 + i * 20;
          return y < 658 ? <line key={i} x1="0" y1={y} x2="1000" y2={y} stroke="#5a3818" strokeWidth="1" opacity="0.55" /> : null;
        })}

        <polygon points="0,558 262,482 738,482 1000,558 1000,575 0,575" fill="#000" opacity="0.14" />

        <rect x="816" y="152" width="132" height="160" fill="#f5e090" opacity="0.12" rx="4" />
        <rect x="820" y="156" width="124" height="152" fill="#c8a030" opacity="0.35" rx="3" />
        <rect x="826" y="162" width="112" height="140" fill="#f5d870" opacity="0.88" rx="1" />
        <rect x="820" y="156" width="124" height="152" fill="none" stroke="#3a2208" strokeWidth="6" rx="3" />
        <rect x="820" y="231" width="124" height="5" fill="#3a2208" />
        <rect x="882" y="156" width="5" height="152" fill="#3a2208" />
        <rect x="815" y="306" width="134" height="9" fill="#5a3820" rx="1" />
        <rect x="815" y="306" width="134" height="2" fill="#a07040" opacity="0.3" rx="1" />
        <polygon points="820,315 944,315 970,420 794,420" fill="#f5d060" opacity="0.055" />

        <rect x="276" y="392" width="448" height="22" fill="#8c5c32" rx="1" />
        <rect x="276" y="392" width="448" height="2" fill="#b07848" opacity="0.5" />
        <rect x="280" y="414" width="440" height="38" fill="#6a4020" />
        <rect x="284" y="450" width="432" height="7" fill="#000" opacity="0.22" rx="1" />
        <rect x="292" y="436" width="11" height="30" fill="#5a3018" />
        <rect x="697" y="436" width="11" height="30" fill="#5a3018" />
      </svg>

      <StudioObject id="calendar" label="Calendar" onOpen={handleOpen} isOpen={openWindows.has("calendar")} style={{ left: "12%", top: "27%", transform: "translate(-50%, -50%)" }}>
        <WallCalendar />
      </StudioObject>

      <StudioObject id="releases" label="Releases" onOpen={handleOpen} isOpen={openWindows.has("releases")} style={{ left: "11%", top: "57%", transform: "translate(-50%, -50%)" }}>
        <RecordShelf />
      </StudioObject>

      <StudioObject id="feedback" label="Feedback" onOpen={handleOpen} isOpen={openWindows.has("feedback")} style={{ left: "38%", top: "54%", transform: "translate(-50%, -50%)" }}>
        <Typewriter />
      </StudioObject>

      <StudioObject id="royalties" label="Royalties" onOpen={handleOpen} isOpen={openWindows.has("royalties")} style={{ left: "50%", top: "55%", transform: "translate(-50%, -50%)" }}>
        <PiggyBank />
      </StudioObject>

      <StudioObject id="crm" label="CRM" onOpen={handleOpen} isOpen={openWindows.has("crm")} style={{ left: "61%", top: "55%", transform: "translate(-50%, -50%)" }}>
        <Phonebook />
      </StudioObject>

      <StudioObject id="assistant" label="Assistant" onOpen={handleOpen} isOpen={openWindows.has("assistant")} idle="breathe" style={{ left: "70%", top: "51%", transform: "translate(-50%, -50%)" }}>
        <Robot />
      </StudioObject>

      <StudioObject id="library" label="Library" onOpen={handleOpen} isOpen={openWindows.has("library")} style={{ left: "85%", top: "63%", transform: "translate(-50%, -50%)" }}>
        <VinylCrates />
      </StudioObject>

      <StudioObject
        id="settings"
        label="Settings"
        onOpen={handleOpen}
        isOpen={openWindows.has("settings")}
        style={{ left: "34%", top: "68%", transform: "translate(-50%, -50%)" }}
      >
        <BenchWrench />
      </StudioObject>

      <AnimatePresence>
        {windowOrder.map((id, idx) => {
          const anchorRect = openWindows.get(id);
          const def = STUDIO_WINDOWS[id];
          if (!anchorRect || !def) return null;
          const { top, left } = positionWindow(anchorRect, def.width, def.height);
          return (
            <StudioWindow
              key={id}
              id={id}
              title={def.title}
              width={def.width}
              height={def.height}
              top={top}
              left={left}
              zIndex={1000 + idx}
              onClose={handleClose}
              onFocus={handleFocus}
            >
              {def.content({
                initialFeedbackVersionId:
                  id === "feedback" ? feedbackVersion : null,
                initialReleaseId: id === "releases" ? releaseId : null,
                initialSongId: id === "library" ? catalogSongId : null,
                initialContactId: id === "crm" ? crmContactId : null,
                initialRoyaltiesReleaseId:
                  id === "royalties" ? royaltiesReleaseId : null,
              })}
            </StudioWindow>
          );
        })}
      </AnimatePresence>

      <StudioViewportActions />

      <div className="pointer-events-none absolute right-5 bottom-4 font-mono text-[9px] tracking-[0.2em] text-amber-900/40 uppercase">
        sidestage studio
      </div>
    </div>
  );
}
