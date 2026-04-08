"use client";

/** Pixel-scale props used on the isometric desktop room — shared with mobile bookshelf. */

export function WallCalendar() {
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

export function RecordShelf() {
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

export function Typewriter() {
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

export function PiggyBank() {
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

export function Phonebook() {
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

export function Robot() {
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

export function BenchWrench() {
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

export function VinylCrates() {
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
