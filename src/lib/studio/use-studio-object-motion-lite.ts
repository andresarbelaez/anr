"use client";

import { useEffect, useState } from "react";

/**
 * After mount: use lighter Framer Motion on coarse pointers or reduced-motion.
 * Defaults `true` for SSR + first client paint (matches server); desktop with mouse
 * flips to `false` after hydration so hover/breathe stay rich there.
 */
export function useStudioObjectMotionLite(): boolean {
  const [lite, setLite] = useState(true);

  useEffect(() => {
    const mqCoarse = window.matchMedia("(pointer: coarse)");
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const read = () => mqCoarse.matches || mqReduce.matches;
    setLite(read());

    const onChange = () => setLite(read());
    mqCoarse.addEventListener("change", onChange);
    mqReduce.addEventListener("change", onChange);
    return () => {
      mqCoarse.removeEventListener("change", onChange);
      mqReduce.removeEventListener("change", onChange);
    };
  }, []);

  return lite;
}
