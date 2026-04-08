"use client";

/**
 * SVG fragments matching the desktop isometric room — window + wood vocabulary
 * from `StudioDesktopRoom` (desk shelf tones, sill, mullion).
 */

export function StudioRoomWindowGraphic({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="812 148 138 182"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <rect x="816" y="152" width="132" height="160" fill="#f5e090" opacity="0.12" rx="4" />
      <rect x="820" y="156" width="124" height="152" fill="#c8a030" opacity="0.35" rx="3" />
      <rect x="826" y="162" width="112" height="140" fill="#f5d870" opacity="0.88" rx="1" />
      <rect x="820" y="156" width="124" height="152" fill="none" stroke="#3a2208" strokeWidth="6" rx="3" />
      <rect x="820" y="231" width="124" height="5" fill="#3a2208" />
      <rect x="882" y="156" width="5" height="152" fill="#3a2208" />
      <rect x="815" y="306" width="134" height="9" fill="#5a3820" rx="1" />
      <rect x="815" y="306" width="134" height="2" fill="#a07040" opacity="0.3" rx="1" />
      <polygon points="820,315 944,315 970,420 794,420" fill="#f5d060" opacity="0.055" />
    </svg>
  );
}

/** Vertical bookshelf: same plank / desk wood language as the desktop desk (`#8c5c32`, `#6a4020`, `#5a3018`). */
export function StudioMobileBookshelfGraphic({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 280 520"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="mobileShelfShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.2" />
          <stop offset="15%" stopColor="#000" stopOpacity="0" />
          <stop offset="85%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
        <pattern id="mobileBackPlank" x="0" y="0" width="24" height="520" patternUnits="userSpaceOnUse">
          <rect width="24" height="520" fill="#2a1b0f" />
          <rect x="23" y="0" width="1" height="520" fill="#1a1008" opacity="0.9" />
        </pattern>
      </defs>

      <rect x="0" y="0" width="280" height="520" fill="url(#mobileBackPlank)" />

      {/* Side posts (like desk legs) */}
      <rect x="8" y="16" width="14" height="488" fill="#6a4020" rx="1" />
      <rect x="258" y="16" width="14" height="488" fill="#6a4020" rx="1" />
      <rect x="10" y="18" width="4" height="484" fill="#000" opacity="0.15" />
      <rect x="266" y="18" width="4" height="484" fill="#000" opacity="0.12" />

      {/* Shelf boards — four bays + bottom */}
      {[
        { y: 52, h: 14 },
        { y: 152, h: 14 },
        { y: 252, h: 14 },
        { y: 352, h: 14 },
        { y: 452, h: 16 },
      ].map((s, i) => (
        <g key={i}>
          <rect x="22" y={s.y} width="236" height={s.h} fill="#8c5c32" rx="1" />
          <rect x="22" y={s.y} width="236" height="2" fill="#b07848" opacity="0.55" />
          <rect x="24" y={s.y + s.h - 6} width="232" height="6" fill="#6a4020" />
          <rect x="22" y={s.y} width="236" height={s.h} fill="url(#mobileShelfShade)" />
        </g>
      ))}

      {/* Subtle floor line */}
      <rect x="0" y="508" width="280" height="12" fill="#1c1208" />
      <line x1="0" y1="508" x2="280" y2="508" stroke="#5a3818" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}
