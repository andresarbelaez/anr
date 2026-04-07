"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";

import { StudioObject } from "./StudioObject";
import { StudioWindow } from "./StudioWindow";
import { positionWindow } from "@/lib/studio/positionWindow";

// ── Studio-native window views ─────────────────────────────────────────────
import { StudioAssistantWindow } from "@/components/studio/windows/StudioAssistantWindow";
import { StudioCalendarWindow } from "@/components/studio/windows/StudioCalendarWindow";
import { StudioReleasesWindow } from "@/components/studio/windows/StudioReleasesWindow";
import { StudioLibraryWindow } from "@/components/studio/windows/StudioLibraryWindow";
import { StudioFeedbackWindow } from "@/components/studio/windows/StudioFeedbackWindow";
import { StudioRoyaltiesWindow } from "@/components/studio/windows/StudioRoyaltiesWindow";
import { StudioCrmWindow } from "@/components/studio/windows/StudioCrmWindow";
import { StudioSettingsWindow } from "@/components/studio/windows/StudioSettingsWindow";
import { useCatalogPlayer } from "@/contexts/catalog-player-context";
import { StudioViewportActions } from "@/components/studio/StudioViewportActions";

// ── Window definitions ─────────────────────────────────────────────────────

/** Passed into each window’s root view — extend per micro-app (e.g. CRM contact id). */
export type StudioWindowLaunchContext = {
  initialFeedbackVersionId?: string | null;
  initialReleaseId?: string | null;
  initialSongId?: string | null;
  initialContactId?: string | null;
  initialRoyaltiesReleaseId?: string | null;
};

interface WindowDef {
  title: string;
  width: number;
  height: number;
  content: (ctx: StudioWindowLaunchContext) => ReactNode;
}

const WINDOWS: Record<string, WindowDef> = {
  calendar: {
    title: "Calendar",
    width: 820,
    height: 600,
    content: () => <StudioCalendarWindow />,
  },
  assistant: {
    title: "ANR-1",
    width: 640,
    height: 540,
    content: () => <StudioAssistantWindow />,
  },
  releases: {
    title: "Releases",
    width: 560,
    height: 520,
    content: (ctx) => (
      <StudioReleasesWindow initialReleaseId={ctx.initialReleaseId ?? null} />
    ),
  },
  library: {
    title: "Library",
    width: 680,
    height: 560,
    content: (ctx) => (
      <StudioLibraryWindow initialSongId={ctx.initialSongId ?? null} />
    ),
  },
  feedback: {
    title: "Feedback",
    width: 600,
    height: 500,
    content: (ctx) => (
      <StudioFeedbackWindow
        initialDetailVersionId={ctx.initialFeedbackVersionId ?? null}
      />
    ),
  },
  royalties: {
    title: "Royalties",
    width: 560,
    height: 520,
    content: (ctx) => (
      <StudioRoyaltiesWindow
        initialRoyaltiesReleaseId={ctx.initialRoyaltiesReleaseId ?? null}
      />
    ),
  },
  crm: {
    title: "CRM",
    width: 700,
    height: 560,
    content: (ctx) => (
      <StudioCrmWindow initialContactId={ctx.initialContactId ?? null} />
    ),
  },
  settings: {
    title: "Settings",
    width: 520,
    height: 540,
    content: () => <StudioSettingsWindow />,
  },
};

// ── Physical object widgets ────────────────────────────────────────────────

function WallCalendar() {
  return (
    <div
      className="overflow-hidden rounded-sm shadow-lg"
      style={{
        width: 44,
        height: 56,
        background: "#f5f0e8",
        border: "1px solid rgba(80,50,20,0.35)",
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{ height: 14, background: "#b22020" }}
      >
        <span
          className="font-mono font-bold text-white"
          style={{ fontSize: 5, letterSpacing: "0.15em" }}
        >
          APR 2026
        </span>
      </div>
      <div
        className="grid gap-[2px] p-[4px]"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 4,
              borderRadius: 1,
              background: i === 5 || i === 12 ? "#cc3333" : "rgba(100,65,35,0.38)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function RecordShelf() {
  const records = ["#1a1a2e", "#2d1b1b", "#1a2e1a", "#2e2a1a", "#1a1a2e", "#2d1b1b", "#1a2e1a"];
  const heights = [40, 36, 42, 34, 40, 36, 38];
  return (
    <div className="flex flex-col items-center gap-0">
      <div className="flex items-end gap-[2px]" style={{ height: 44 }}>
        {records.map((bg, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: heights[i],
              background: bg,
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "2px 2px 0 0",
            }}
          />
        ))}
      </div>
      <div style={{ width: 90, height: 8, background: "#8c5c32", borderRadius: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.5)" }} />
    </div>
  );
}

function Typewriter() {
  return (
    <div className="flex flex-col items-center gap-[3px]">
      <div style={{ width: 24, height: 10, background: "#f0ece4", border: "1px solid rgba(0,0,0,0.2)", borderRadius: "2px 2px 0 0" }} />
      <div style={{ width: 60, height: 44, background: "#252525", border: "2px solid #3a3a3a", borderRadius: 4, padding: "5px 4px 4px", display: "flex", flexDirection: "column", gap: 4, boxShadow: "0 3px 8px rgba(0,0,0,0.7)" }}>
        {[5, 4, 5].map((count, row) => (
          <div key={row} className="flex justify-center gap-[3px]">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, background: "#4a4a4a", border: "1px solid #606060", borderRadius: 2 }} />
            ))}
          </div>
        ))}
        <div style={{ height: 5, background: "#4a4a4a", border: "1px solid #606060", borderRadius: 2, marginTop: -2 }} />
      </div>
    </div>
  );
}

function PiggyBank() {
  return (
    <div className="relative" style={{ width: 52, height: 50 }}>
      <div style={{ position: "absolute", top: 4, right: 14, width: 11, height: 9, background: "#f4b8c0", borderRadius: "50% 50% 0 0" }} />
      <div style={{ position: "absolute", top: 8, left: 0, width: 46, height: 34, background: "#f4b8c0", borderRadius: "50%", boxShadow: "inset -3px -3px 6px rgba(180,80,100,0.25)" }} />
      <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 14, height: 2, background: "rgba(160,60,80,0.55)", borderRadius: 1 }} />
      <div style={{ position: "absolute", top: 22, right: 0, width: 14, height: 11, background: "#f4b8c0", border: "1.5px solid rgba(200,100,120,0.5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
        <div style={{ width: 3, height: 3, background: "#c06070", borderRadius: "50%" }} />
        <div style={{ width: 3, height: 3, background: "#c06070", borderRadius: "50%" }} />
      </div>
      <div style={{ position: "absolute", top: 15, right: 15, width: 5, height: 5, background: "#a84050", borderRadius: "50%" }} />
      {[6, 17, 26, 36].map((l) => (
        <div key={l} style={{ position: "absolute", bottom: 0, left: l, width: 7, height: 12, background: "#f0a8b8", borderRadius: "0 0 3px 3px" }} />
      ))}
    </div>
  );
}

function Phonebook() {
  return (
    <div style={{ position: "relative", width: 38, height: 50, transform: "rotate(-5deg)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 8, height: 50, background: "#6b4a10", borderRadius: "2px 0 0 2px" }} />
      <div style={{ position: "absolute", left: 8, top: 0, right: 0, bottom: 0, background: "#d4a030", borderRadius: "0 2px 2px 0", padding: "6px 4px", display: "flex", flexDirection: "column", gap: 3 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ height: 2, background: "rgba(80,50,10,0.5)", borderRadius: 1, width: `${65 + (i % 3) * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

function Robot() {
  return (
    <div className="flex flex-col items-center" style={{ gap: 2 }}>
      <div style={{ width: 2, height: 8, background: "#9ca3af", position: "relative" }}>
        <div style={{ position: "absolute", top: -4, left: -3, width: 8, height: 8, background: "#f5c842", borderRadius: "50%", boxShadow: "0 0 4px rgba(245,200,66,0.8)" }} />
      </div>
      <div style={{ width: 34, height: 28, background: "#d4d8dc", border: "2px solid #9ca3af", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 5, position: "relative" }}>
        <div className="flex gap-2">
          {[0, 1].map((i) => (
            <div key={i} style={{ width: 8, height: 8, background: "#f5c842", borderRadius: 2, boxShadow: "0 0 5px rgba(245,200,66,0.9)" }} />
          ))}
        </div>
        <div style={{ width: 18, height: 3, background: "#6b7280", borderRadius: 2 }} />
      </div>
      <div style={{ width: 10, height: 4, background: "#9ca3af" }} />
      <div style={{ width: 30, height: 22, background: "#b8bcc4", border: "1.5px solid #9ca3af", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 10, height: 10, border: "1.5px solid #f5c842", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 4, height: 4, background: "#f5c842", borderRadius: "50%", boxShadow: "0 0 4px rgba(245,200,66,0.8)" }} />
        </div>
      </div>
      <div className="flex gap-2">
        {[0, 1].map((i) => (
          <div key={i} style={{ width: 8, height: 14, background: "#9ca3af", borderRadius: "0 0 3px 3px" }} />
        ))}
      </div>
    </div>
  );
}

function BenchWrench() {
  return (
    <div
      style={{
        width: 48,
        height: 36,
        borderRadius: 3,
        background:
          "linear-gradient(165deg, #5c5248 0%, #2d2820 45%, #3a342c 100%)",
        border: "1px solid rgba(60,40,20,0.55)",
        boxShadow:
          "0 3px 8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#c9a66b"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    </div>
  );
}

function VinylCrates() {
  const crateColors = [
    ["#1a1a2e", "#2d1b1b", "#1a2e1a", "#2e2a1a"],
    ["#2e2a1a", "#1a1a2e", "#2d1b1b", "#1a2e1a"],
  ];
  return (
    <div className="flex flex-col gap-1">
      {crateColors.map((records, ci) => (
        <div key={ci} style={{ width: 60, height: 38, background: "#3a3530", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 2, position: "relative", overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>
          {[25, 50, 75].map((pct) => (
            <div key={pct} style={{ position: "absolute", top: 0, bottom: 0, left: `${pct}%`, width: 1, background: "rgba(255,255,255,0.08)" }} />
          ))}
          <div className="absolute flex gap-[2px]" style={{ bottom: 3, left: 3, right: 3 }}>
            {records.map((bg, i) => (
              <div key={i} style={{ flex: 1, height: 26, background: bg, borderRadius: "2px 2px 0 0", border: "1px solid rgba(255,255,255,0.07)" }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main room ──────────────────────────────────────────────────────────────

function centerViewportAnchor(): DOMRect {
  if (typeof window === "undefined") {
    return new DOMRect(0, 0, 0, 0);
  }
  const x = window.innerWidth / 2;
  const y = window.innerHeight / 2;
  return new DOMRect(x, y, 0, 0);
}

export function StudioRoom() {
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

  /** Deep-link / legacy query params: open the right window once per URL key. */
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
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* ── SVG room background ─────────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full"
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
          {/* Vertical ceiling planks — same wood family as floor, seams run top→bottom */}
          <pattern id="ceilPlanks" x="0" y="0" width="26" height="200" patternUnits="userSpaceOnUse">
            <rect width="26" height="200" fill="#6a4020" />
            <rect x="25" y="0" width="1" height="200" fill="#3a2008" opacity="0.88" />
            <rect x="0" y="95" width="26" height="1" fill="#8a5828" opacity="0.18" />
          </pattern>
          {/* Overhead shadow — makes ceiling read darker than floor */}
          <linearGradient id="ceilShade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#000" stopOpacity="0.52" />
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

        {/* Window */}
        <rect x="816" y="152" width="132" height="160" fill="#f5e090" opacity="0.12" rx="4" />
        <rect x="820" y="156" width="124" height="152" fill="#c8a030" opacity="0.35" rx="3" />
        <rect x="826" y="162" width="112" height="140" fill="#f5d870" opacity="0.88" rx="1" />
        <rect x="820" y="156" width="124" height="152" fill="none" stroke="#3a2208" strokeWidth="6" rx="3" />
        <rect x="820" y="231" width="124" height="5" fill="#3a2208" />
        <rect x="882" y="156" width="5" height="152" fill="#3a2208" />
        <rect x="815" y="306" width="134" height="9" fill="#5a3820" rx="1" />
        <rect x="815" y="306" width="134" height="2" fill="#a07040" opacity="0.3" rx="1" />
        <polygon points="820,315 944,315 970,420 794,420" fill="#f5d060" opacity="0.055" />

        {/* Desk */}
        <rect x="276" y="392" width="448" height="22" fill="#8c5c32" rx="1" />
        <rect x="276" y="392" width="448" height="2" fill="#b07848" opacity="0.5" />
        <rect x="280" y="414" width="440" height="38" fill="#6a4020" />
        <rect x="284" y="450" width="432" height="7" fill="#000" opacity="0.22" rx="1" />
        <rect x="292" y="436" width="11" height="30" fill="#5a3018" />
        <rect x="697" y="436" width="11" height="30" fill="#5a3018" />
      </svg>

      {/* ── Clickable room objects ────────────────────────────────────── */}

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

      {/* ── Floating windows ─────────────────────────────────────────── */}
      <AnimatePresence>
        {windowOrder.map((id, idx) => {
          const anchorRect = openWindows.get(id);
          const def = WINDOWS[id];
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

      {/* Ambient room label */}
      <div className="pointer-events-none absolute bottom-4 right-5 font-mono text-[9px] uppercase tracking-[0.2em] text-amber-900/40">
        anr studio
      </div>
    </div>
  );
}
