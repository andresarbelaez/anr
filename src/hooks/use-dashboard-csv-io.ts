"use client";

import { useCallback, useState } from "react";

export type DashboardIoMessage = {
  kind: "success" | "error";
  text: string;
};

/**
 * Shared export/import busy flags + flash message state for dashboard list pages (Library, Contacts).
 */
export function useDashboardCsvIo() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [ioMessage, setIoMessage] = useState<DashboardIoMessage | null>(null);

  const showIoSuccess = useCallback((text: string) => {
    setIoMessage({ kind: "success", text });
  }, []);

  const showIoError = useCallback((text: string) => {
    setIoMessage({ kind: "error", text });
  }, []);

  const clearIoMessage = useCallback(() => setIoMessage(null), []);

  return {
    exporting,
    setExporting,
    importing,
    setImporting,
    ioMessage,
    setIoMessage,
    showIoSuccess,
    showIoError,
    clearIoMessage,
  };
}
