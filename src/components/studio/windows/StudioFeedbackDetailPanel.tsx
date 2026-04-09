"use client";

import { FeedbackArtistDetailClient } from "@/components/feedback/FeedbackArtistDetailClient";

/** Remap FeedbackArtistDetailClient’s dark Tailwind neutrals → studio light tokens. */
const STUDIO_FB_DETAIL_CSS = `
.studio-fb-detail .text-white,
.studio-fb-detail .text-neutral-100 { color: #1e1008 !important; }
.studio-fb-detail .text-neutral-200 { color: #2a1a0a !important; }
.studio-fb-detail .text-neutral-300 { color: #5a3518 !important; }
.studio-fb-detail .text-neutral-400 { color: #8a6040 !important; }
.studio-fb-detail .text-neutral-500 { color: #8a6040 !important; }
.studio-fb-detail .text-neutral-600 { color: #a07050 !important; }
.studio-fb-detail .text-green-400\\/90 { color: #1a7a42 !important; }
.studio-fb-detail .text-pink-400 { color: #b84870 !important; }
.studio-fb-detail .text-red-300 { color: #a82820 !important; }

.studio-fb-detail .border-neutral-800 { border-color: #d4b896 !important; }
.studio-fb-detail .bg-neutral-950\\/80 { background-color: rgba(245,237,224,0.95) !important; }
.studio-fb-detail .bg-neutral-800 { background-color: #e8d4bb !important; }
.studio-fb-detail .hover\\:bg-neutral-800:hover { background-color: #e8d4bb !important; }
.studio-fb-detail .bg-neutral-950 { background-color: #f5ede0 !important; }

.studio-fb-detail .bg-white { background-color: #4a2e14 !important; }
.studio-fb-detail .text-black { color: #f5ede0 !important; }
.studio-fb-detail .hover\\:bg-neutral-200:hover { background-color: #5a3a1c !important; }

.studio-fb-detail button.text-neutral-500 { color: #8a6040 !important; }
.studio-fb-detail .hover\\:text-red-300:hover { color: #a82820 !important; }

.studio-fb-detail .border-t { border-color: #d4b896 !important; }
`;

type Props = {
  versionId: string;
  onMissingVersion?: () => void;
  onLoadedMeta?: (meta: { songTitle: string; versionLabel: string }) => void;
};

export function StudioFeedbackDetailPanel({
  versionId,
  onMissingVersion,
  onLoadedMeta,
}: Props) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{ background: "#fdf8f0" }}
    >
      {/* Wrapper so the detail client is the flex-1 column; global <style> stays out of the flex flow. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <FeedbackArtistDetailClient
          versionId={versionId}
          onMissingVersion={onMissingVersion}
          onLoadedMeta={onLoadedMeta}
        />
      </div>
      <style>{STUDIO_FB_DETAIL_CSS}</style>
    </div>
  );
}
