"use client";

import { useEffect, useState } from "react";

/** Media queries that can change the mobile vs desktop studio shell decision. */
function getLayoutMediaLists(): MediaQueryList[] {
  if (typeof window === "undefined") return [];
  return [
    window.matchMedia("(pointer: coarse)"),
    window.matchMedia("(max-width: 1023px)"),
    window.matchMedia("(min-width: 1024px)"),
    window.matchMedia("(min-width: 768px)"),
    window.matchMedia("(orientation: landscape)"),
    window.matchMedia("(min-height: 600px)"),
  ];
}

function subscribe(onStoreChange: () => void) {
  const onWin = () => onStoreChange();
  window.addEventListener("resize", onWin);
  window.addEventListener("orientationchange", onWin);
  const vv = window.visualViewport;
  if (vv) vv.addEventListener("resize", onWin);

  const mqs = getLayoutMediaLists();
  mqs.forEach((mq) => mq.addEventListener("change", onStoreChange));

  return () => {
    window.removeEventListener("resize", onWin);
    window.removeEventListener("orientationchange", onWin);
    if (vv) vv.removeEventListener("resize", onWin);
    mqs.forEach((mq) => mq.removeEventListener("change", onStoreChange));
  };
}

function isMobileStudioShell(): boolean {
  if (typeof window === "undefined") return false;

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 1023px)").matches;
  if (coarse && narrow) return true;

  if (window.matchMedia("(min-width: 1024px)").matches) return false;

  if (
    window.matchMedia("(min-width: 768px)").matches &&
    window.matchMedia("(orientation: landscape)").matches &&
    window.matchMedia("(min-height: 600px)").matches
  ) {
    return false;
  }

  return true;
}

/**
 * `undefined` when layout is unknown (SSR + first paint without a hint).
 * `serverMobileHint === true` skips the blank shell on real phones (see `getServerMobileStudioHint`).
 * After mount, `isMobileStudioShell()` corrects the hint if needed.
 */
export function useStudioMobileLayout(
  serverMobileHint?: true
): boolean | undefined {
  const [mobile, setMobile] = useState<boolean | undefined>(() =>
    serverMobileHint === true ? true : undefined
  );

  useEffect(() => {
    setMobile(isMobileStudioShell());
    return subscribe(() => setMobile(isMobileStudioShell()));
  }, []);

  return mobile;
}
