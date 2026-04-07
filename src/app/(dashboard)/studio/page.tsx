import { Suspense } from "react";
import { Press_Start_2P } from "next/font/google";
import { StudioRoom } from "@/components/studio/StudioRoom";

export const metadata = { title: "anr studio" };

const pixelFont = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel",
  display: "swap",
});

export default function StudioPage() {
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
            className="flex h-full items-center justify-center bg-[#1c1208] text-amber-900/50"
            style={{ minHeight: "100vh" }}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
              Loading studio…
            </span>
          </div>
        }
      >
        <StudioRoom />
      </Suspense>
    </div>
  );
}
