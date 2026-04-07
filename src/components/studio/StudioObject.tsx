"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  id: string;
  label: string;
  onOpen: (id: string, anchor: HTMLElement) => void;
  isOpen?: boolean;
  style: CSSProperties;
  children: ReactNode;
  idle?: "breathe" | "none";
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

  function handleClick() {
    if (ref.current) onOpen(id, ref.current);
  }

  return (
    <div ref={ref} style={{ position: "absolute", ...style }}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        className="block cursor-pointer border-none bg-transparent p-0 focus:outline-none"
      >
        <motion.div
          className="group relative flex flex-col items-center cursor-pointer select-none"
          animate={idle === "breathe" ? { y: [0, -5, 0] } : undefined}
          transition={
            idle === "breathe"
              ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              : undefined
          }
          whileHover={{
            scale: 1.1,
            filter: isOpen
              ? "drop-shadow(0 0 10px rgba(255,200,80,1)) drop-shadow(0 0 24px rgba(255,200,80,0.5))"
              : "drop-shadow(0 0 8px rgba(255,200,80,0.9)) drop-shadow(0 0 20px rgba(255,200,80,0.4))",
          }}
          whileTap={{ scale: 0.96 }}
          style={
            isOpen
              ? { filter: "drop-shadow(0 0 6px rgba(255,200,80,0.65))" }
              : undefined
          }
        >
          {/* Tooltip label — appears above on hover */}
          <span
            className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-2 py-0.5 uppercase text-amber-200 opacity-0 shadow transition-opacity duration-200 group-hover:opacity-100"
            style={{
              fontFamily: "var(--font-pixel, ui-monospace, monospace)",
              fontSize: 7,
              letterSpacing: "0.1em",
            }}
          >
            {label}
          </span>

          {children}

          {/* Open indicator dot */}
          {isOpen && (
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-amber-400"
              style={{ boxShadow: "0 0 4px rgba(255,200,64,0.9)" }}
            />
          )}
        </motion.div>
      </button>
    </div>
  );
}
