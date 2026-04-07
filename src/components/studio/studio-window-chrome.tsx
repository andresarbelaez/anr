"use client";

import { createContext, useContext } from "react";

/** Navigation actions wired to title-bar chevrons (back / forward history). */
export type StudioWindowNav = {
  canBack: boolean;
  canForward: boolean;
  goBack: () => void;
  goForward: () => void;
};

export const STUDIO_WINDOW_DEFAULT_NAV: StudioWindowNav = {
  canBack: false,
  canForward: false,
  goBack: () => {},
  goForward: () => {},
};

export type StudioWindowChromeApi = {
  /** `null` restores the window’s default title from `StudioWindow` props. */
  setTitle: (title: string | null) => void;
  setNav: (nav: StudioWindowNav) => void;
  resetChrome: () => void;
};

export const StudioWindowChromeContext =
  createContext<StudioWindowChromeApi | null>(null);

export function useStudioWindowChrome(): StudioWindowChromeApi {
  const ctx = useContext(StudioWindowChromeContext);
  if (!ctx) {
    throw new Error(
      "useStudioWindowChrome must be used inside a StudioWindow content tree"
    );
  }
  return ctx;
}
