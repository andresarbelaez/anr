"use client";

/** Pixel-scale props used on the isometric desktop room — shared with mobile bookshelf. */

export function WallCalendar() {
  const cols = 7;
  const rows = 4;
  const cells = cols * rows;
  const marked = new Set([9, 20]);
  const cellW = 7;
  const cellH = 4;
  const gap = 2;
  const pad = 4;
  const gridInnerW = cols * cellW + (cols - 1) * gap;
  const outerW = gridInnerW + pad * 2 + 2;
  const headerH = 20;
  const gridBlockH = pad * 2 + rows * cellH + (rows - 1) * gap;
  const outerH = headerH + gridBlockH + 2;
  return (
    <div
      className="overflow-hidden shadow-lg"
      style={{
        width: outerW,
        height: outerH,
        background: "#f5f0e8",
        border: "1px solid rgba(80,50,20,0.35)",
        borderRadius: "0 0 4px 4px",
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{ height: headerH, background: "#b22020", padding: "0 3px" }}
      >
        <span
          className="font-mono font-bold text-white"
          style={{ fontSize: 10, letterSpacing: "0.1em", lineHeight: 1 }}
        >
          {"APR \u201926"}
        </span>
      </div>
      <div
        className="grid p-[4px]"
        style={{
          gap,
          gridTemplateColumns: `repeat(${cols}, ${cellW}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellH}px)`,
        }}
      >
        {Array.from({ length: cells }).map((_, i) => (
          <div
            key={i}
            style={{
              width: cellW,
              height: cellH,
              borderRadius: 1,
              background: marked.has(i) ? "#cc3333" : "rgba(100,65,35,0.38)",
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
  /* Preflight border-box: keyboard width 60 includes its 2px border — stack with items-center so paper and keys share one centerline. */
  const bodyW = 60;
  return (
    <div className="flex flex-col items-center" style={{ gap: 2 }}>
      <div
        style={{
          width: 50,
          height: 27,
          background: "#f0ece4",
          border: "1px solid rgba(0,0,0,0.2)",
          borderRadius: "4px 4px 0 0",
          boxSizing: "border-box",
          padding: "6px 7px 5px",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {[
          { w: "90%", a: 0.22 },
          { w: "62%", a: 0.17 },
          { w: "78%", a: 0.2 },
        ].map((line, i) => (
          <div
            key={i}
            style={{
              alignSelf: "flex-start",
              width: line.w,
              height: 2,
              borderRadius: 1,
              background: `rgba(0,0,0,${line.a})`,
            }}
          />
        ))}
      </div>
      {/* Platen — rubber roller behind the sheet; reads as the bar between paper and keyboard. */}
      <div
        aria-hidden
        style={{
          width: bodyW,
          height: 5,
          marginTop: -1,
          borderRadius: 2,
          background: "linear-gradient(180deg, #6e6e6e 0%, #4a4a4a 38%, #2f2f2f 72%, #242424 100%)",
          border: "1px solid #171717",
          boxSizing: "border-box",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
        }}
      />
      <div
        style={{
          width: bodyW,
          height: 44,
          marginTop: -2,
          background: "#252525",
          border: "2px solid #3a3a3a",
          borderRadius: 4,
          padding: "5px 4px 4px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          boxShadow: "0 3px 8px rgba(0,0,0,0.7)",
          boxSizing: "border-box",
        }}
      >
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
      <div style={{ position: "absolute", top: 9, left: "38%", transform: "translateX(-50%)", width: 14, height: 2, background: "rgba(160,60,80,0.55)", borderRadius: 1 }} />
      <div style={{ position: "absolute", top: 22, right: 0, width: 14, height: 11, background: "#f4b8c0", border: "1.5px solid rgba(200,100,120,0.5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
        <div style={{ width: 3, height: 3, background: "#c06070", borderRadius: "50%" }} />
        <div style={{ width: 3, height: 3, background: "#c06070", borderRadius: "50%" }} />
      </div>
      <div style={{ position: "absolute", top: 15, right: 15, width: 5, height: 5, background: "#a84050", borderRadius: "50%" }} />
      {/* Side profile: hind + front; other pair hidden behind the body. */}
      <div style={{ position: "absolute", bottom: 0, left: 10, width: 8, height: 13, background: "#f0a8b8", borderRadius: "0 0 3px 3px" }} />
      <div style={{ position: "absolute", bottom: 0, left: 28, width: 7, height: 11, background: "#eab0bc", borderRadius: "0 0 3px 3px" }} />
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

/** My Profile — vanity mirror on the desk (warm frame, cool glass). */
export function StudioProfileMirror() {
  return (
    <div
      style={{
        width: 44,
        height: 56,
        padding: 6,
        borderRadius: "10px 10px 12px 12px",
        boxSizing: "border-box",
        background: "linear-gradient(148deg, #8c6a50 0%, #5c4232 42%, #403024 100%)",
        border: "1px solid rgba(35, 24, 16, 0.55)",
        boxShadow:
          "0 4px 10px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -3px 5px rgba(0,0,0,0.28)",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "5px 5px 7px 7px",
          background: `
            radial-gradient(ellipse 110% 90% at 20% 14%, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.12) 42%, transparent 65%),
            linear-gradient(168deg, #e8eef6 0%, #cfd9e8 22%, #b8c9dc 48%, #9eb4cc 74%, #889eb8 100%)
          `,
          border: "1px solid rgba(255,255,255,0.5)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -3px 12px rgba(70,95,120,0.18)",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "5%",
            right: "8%",
            width: "30%",
            height: "13%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.75), rgba(255,255,255,0.1) 42%, transparent 68%)",
            opacity: 0.8,
          }}
        />
      </div>
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
