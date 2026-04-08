"use client";

import { AssistantClient } from "@/components/assistant/AssistantClient";
import { StudioMicroappSkeletonAssistantEmbedded } from "@/components/studio/ui/studio-microapp-skeletons";

/**
 * CSS overrides that remap AssistantClient's dark Tailwind palette → warm
 * light studio tones for every element inside `.studio-chat`.
 */
const STUDIO_CHAT_CSS = `
/* ── Outer container ─────────────────────────────────────────────────────── */
.studio-chat .bg-neutral-950\\/50  { background-color: rgba(253,248,240,0.98) !important; }
.studio-chat .border-neutral-800  { border-color: #d4b896 !important; }
.studio-chat .border-neutral-700  { border-color: #c0a070 !important; }

/* ── Text ────────────────────────────────────────────────────────────────── */
.studio-chat .text-white          { color: #1e1008 !important; }
.studio-chat .text-neutral-100    { color: #1e1008 !important; }
.studio-chat .text-neutral-300    { color: #5a3518 !important; }
.studio-chat .text-neutral-500    { color: #8a6040 !important; }
.studio-chat .text-black          { color: #f5ede0 !important; }

/* ── Background fills ────────────────────────────────────────────────────── */
.studio-chat .bg-neutral-900      { background-color: #ede0cc !important; }
.studio-chat .bg-neutral-800      { background-color: #e8d4bb !important; }
.studio-chat .bg-white            { background-color: #4a2e14 !important; }

/* ── Error banner ────────────────────────────────────────────────────────── */
.studio-chat .border-red-900\\/40  { border-color: rgba(168,40,32,0.30) !important; }
.studio-chat .bg-red-950\\/20      { background-color: rgba(168,40,32,0.08) !important; }
.studio-chat .text-red-200        { color: #a82820 !important; }

/* ── Mutation proposal panel ─────────────────────────────────────────────── */
.studio-chat .border-amber-900\\/50 { border-color: rgba(140,92,50,0.40) !important; }
.studio-chat .bg-amber-950\\/20     { background-color: rgba(168,92,16,0.08) !important; }
.studio-chat .text-amber-200\\/90   { color: #8a5010 !important; }

/* ── Textarea ────────────────────────────────────────────────────────────── */
.studio-chat textarea {
  background-color: #f5ede0 !important;
  border-color:     #d4b896 !important;
  color:            #1e1008 !important;
}
.studio-chat textarea:focus {
  outline:    none !important;
  box-shadow: 0 0 0 2px rgba(168,92,16,0.20) !important;
}
.studio-chat textarea::placeholder { color: #b89070 !important; }

/* ── Scrollbar ───────────────────────────────────────────────────────────── */
.studio-chat ::-webkit-scrollbar-thumb { background: #c0a070 !important; }
`;

export function StudioAssistantWindow() {
  return (
    <div
      className="studio-chat"
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#fdf8f0",
      }}
    >
      <style>{STUDIO_CHAT_CSS}</style>
      <AssistantClient
        className="flex h-full"
        conversationLoadingFallback={
          <StudioMicroappSkeletonAssistantEmbedded />
        }
      />
    </div>
  );
}
