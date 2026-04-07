/**
 * Scoped Tailwind neutral/dark remaps → studio light palette.
 * Wrap content in an element with class `studio-neutral-bridge`.
 */
export const STUDIO_NEUTRAL_BRIDGE_CSS = `
.studio-neutral-bridge .text-white { color: #1e1008 !important; }
.studio-neutral-bridge .text-neutral-100 { color: #1e1008 !important; }
.studio-neutral-bridge .text-neutral-200 { color: #2a1a0a !important; }
.studio-neutral-bridge .text-neutral-300 { color: #5a3518 !important; }
.studio-neutral-bridge .text-neutral-400 { color: #8a6040 !important; }
.studio-neutral-bridge .text-neutral-500 { color: #8a6040 !important; }
.studio-neutral-bridge .text-neutral-600 { color: #a07050 !important; }
.studio-neutral-bridge .text-red-200 { color: #a82820 !important; }
.studio-neutral-bridge .text-red-300 { color: #a82820 !important; }
.studio-neutral-bridge .text-red-400 { color: #a82820 !important; }
.studio-neutral-bridge .text-emerald-100 { color: #0d4d26 !important; }

.studio-neutral-bridge .border-neutral-800 { border-color: #d4b896 !important; }
.studio-neutral-bridge .divide-neutral-800 > :not([hidden]) ~ :not([hidden]) {
  border-color: #d4b896 !important;
}
.studio-neutral-bridge .border-red-900\\/60 { border-color: rgba(168,40,32,0.35) !important; }
.studio-neutral-bridge .bg-red-950\\/30 { background-color: rgba(168,40,32,0.08) !important; }

.studio-neutral-bridge .bg-neutral-700 { background-color: #d4b896 !important; }
.studio-neutral-bridge .bg-neutral-800 { background-color: #e8d4bb !important; }
.studio-neutral-bridge .bg-neutral-900 { background-color: #ede0cc !important; }
.studio-neutral-bridge .bg-neutral-950 { background-color: #f5ede0 !important; }
.studio-neutral-bridge .bg-neutral-950\\/50 { background-color: rgba(245,237,224,0.5) !important; }
.studio-neutral-bridge .bg-neutral-950\\/80 { background-color: rgba(245,237,224,0.92) !important; }
.studio-neutral-bridge .bg-emerald-950\\/80 { background-color: rgba(13,77,38,0.08) !important; }
.studio-neutral-bridge .border-emerald-600\\/70 { border-color: rgba(26,122,66,0.45) !important; }

.studio-neutral-bridge .hover\\:text-white:hover { color: #1e1008 !important; }
.studio-neutral-bridge .hover\\:text-red-300:hover { color: #a82820 !important; }
.studio-neutral-bridge .hover\\:text-neutral-300:hover { color: #5a3518 !important; }

.studio-neutral-bridge input.flex.h-10,
.studio-neutral-bridge textarea,
.studio-neutral-bridge select {
  background-color: #fdf8f0 !important;
  border-color: #d4b896 !important;
  color: #1e1008 !important;
}
.studio-neutral-bridge input:focus,
.studio-neutral-bridge textarea:focus,
.studio-neutral-bridge select:focus {
  --tw-ring-color: rgba(168,92,16,0.35) !important;
}
.studio-neutral-bridge .placeholder\\:text-neutral-500::placeholder,
.studio-neutral-bridge input::placeholder,
.studio-neutral-bridge textarea::placeholder {
  color: #b89070 !important;
}

.studio-neutral-bridge label.block.text-sm.font-medium.text-neutral-300,
.studio-neutral-bridge label.text-neutral-300 {
  color: #5a3518 !important;
}
.studio-neutral-bridge input[type="file"] {
  color: #5a3518 !important;
}
.studio-neutral-bridge input[type="file"]::file-selector-button {
  background-color: #e8d4bb !important;
  color: #1e1008 !important;
  border: 1px solid #d4b896 !important;
  border-radius: 0.5rem !important;
  padding: 0.5rem 1rem !important;
  margin-right: 0.75rem !important;
}

/* Buttons (dashboard ui/button) inside bridged surfaces */
.studio-neutral-bridge .border-neutral-700 { border-color: #d4b896 !important; }
.studio-neutral-bridge .hover\\:bg-neutral-800:hover { background-color: #e8d4bb !important; }
.studio-neutral-bridge .hover\\:text-white:hover { color: #1e1008 !important; }
.studio-neutral-bridge .focus-visible\\:ring-neutral-500:focus-visible {
  --tw-ring-color: rgba(168,92,16,0.35) !important;
}
`;
