"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { m } from "framer-motion";
import { useStudioObjectMotionLite } from "@/lib/studio/use-studio-object-motion-lite";
import { prefetchStudioMicroapp } from "@/lib/studio/prefetch-studio-microapp";

interface Props {
  id: string;
  label: string;
  onOpen: (id: string, anchor: HTMLElement) => void;
  isOpen?: boolean;
  style: CSSProperties;
  children: ReactNode;
  idle?: "breathe" | "none";
}

function studioObjectFilter(hover: boolean, isOpen: boolean, motionLite: boolean): string {
  if (motionLite) return "none";
  if (hover) {
    return isOpen
      ? "drop-shadow(0 0 10px rgba(255,200,80,0.97)) drop-shadow(0 0 24px rgba(255,200,80,0.47))"
      : "drop-shadow(0 0 8px rgba(255,200,80,0.87)) drop-shadow(0 0 20px rgba(255,200,80,0.37))";
  }
  if (isOpen) return "drop-shadow(0 0 6px rgba(255,200,80,0.62))";
  return "none";
}

export function StudioObject({
  id,
  label,
  onOpen,
  isOpen = false,
  style,
  children,
  idle = "none",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const motionLite = useStudioObjectMotionLite();
  const [hover, setHover] = useState(false);

  function handleClick() {
    if (ref.current) onOpen(id, ref.current);
  }

  const labelGlow =
    hover && !motionLite
      ? {
          boxShadow:
            "0 0 12px rgba(255,200,80,0.55), 0 0 24px rgba(255,200,80,0.28)",
        }
      : undefined;

  return (
    <div ref={ref} style={{ position: "absolute", ...style }}>
      <button
        type="button"
        onPointerDown={() => prefetchStudioMicroapp(id)}
        onClick={handleClick}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        aria-label={label}
        className="block cursor-pointer border-none bg-transparent p-0 focus:outline-none"
      >
        <div className="relative flex cursor-pointer flex-col items-center select-none">
          <span
            className="mb-1.5 max-w-[10rem] text-center text-[8px] leading-tight tracking-[0.08em] text-amber-200 uppercase transition-[box-shadow,transform] duration-200 ease-out sm:max-w-none sm:whitespace-nowrap sm:tracking-[0.1em]"
            style={{
              fontFamily: "var(--font-pixel, ui-monospace, monospace)",
              textShadow: "0 1px 2px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.45)",
              transform: hover && !motionLite ? "scale(1.06)" : undefined,
            }}
            aria-hidden
          >
            <span
              className="inline-block rounded bg-black/80 px-2 py-0.5 shadow backdrop-blur-[1px] transition-[box-shadow] duration-200 ease-out"
              style={labelGlow}
            >
              {label}
            </span>
          </span>

          <m.div
            className="relative bg-transparent transition-[filter] duration-200 ease-out"
            animate={{
              y:
                !motionLite && idle === "breathe"
                  ? [0, -5, 0]
                  : 0,
              scale:
                hover && !motionLite ? 1.1 : 1,
            }}
            transition={
              !motionLite && idle === "breathe"
                ? {
                    y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                    scale: { type: "spring", stiffness: 520, damping: 28 },
                  }
                : {
                    scale: { type: "spring", stiffness: 520, damping: 28 },
                  }
            }
            whileTap={{ scale: motionLite ? 0.98 : 0.96 }}
            style={
              motionLite && isOpen
                ? {
                    boxShadow:
                      "0 0 0 2px rgba(255,200,80,0.42), 0 4px 14px rgba(255,200,64,0.17)",
                  }
                : { filter: studioObjectFilter(hover, isOpen, motionLite) }
            }
          >
            {children}

            {isOpen && (
              <div
                className="absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-amber-400"
                style={{ boxShadow: "0 0 4px rgba(255,200,64,0.87)" }}
              />
            )}
          </m.div>
        </div>
      </button>
    </div>
  );
}
