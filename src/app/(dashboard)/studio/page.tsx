import { Suspense } from "react";
import { Press_Start_2P } from "next/font/google";
import { StudioRoom } from "@/components/studio/StudioRoom";
import { getServerMobileStudioHint } from "@/lib/studio/server-mobile-studio-hint";

export const metadata = { title: "sidestage studio" };

const pixelFont = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel",
  display: "swap",
});

export default async function StudioPage() {
  const serverMobileHint = await getServerMobileStudioHint();

  return (
    // Break out of the dashboard's p-8 padding to create a full-bleed room experience
    // --font-pixel CSS variable is available to StudioObject tooltip spans
    <div
      className={`-m-8 overflow-hidden ${pixelFont.variable}`}
      style={{ height: "100vh" }}
    >
      <Suspense
        fallback={
          <div
            className="flex h-full min-h-[100vh] flex-col items-center justify-center gap-3 bg-[#1c1208] px-6 text-amber-900/50"
          >
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-[#5a3518] border-t-[#d4b896]"
              aria-hidden
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
              Loading studio…
            </span>
          </div>
        }
      >
        <StudioRoom serverMobileHint={serverMobileHint} />
      </Suspense>
    </div>
  );
}
