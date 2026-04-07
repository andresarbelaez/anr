"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { FeedbackVersionLink } from "@/lib/supabase/types";
import { cn } from "@/lib/utils/cn";
import { S } from "@/components/studio/ui/s";

type Props = {
  open: boolean;
  onClose: () => void;
  catalogSongVersionId: string;
  songTitle: string;
  versionLabel: string;
};

export function FeedbackShareModal({
  open,
  onClose,
  catalogSongVersionId,
  songTitle,
  versionLabel,
}: Props) {
  const [linkRow, setLinkRow] = useState<FeedbackVersionLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const loadOrCreate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: existing, error: selErr } = await supabase
        .from("feedback_version_links")
        .select("*")
        .eq("catalog_song_version_id", catalogSongVersionId)
        .maybeSingle();

      if (selErr) throw new Error(selErr.message);
      if (existing) {
        setLinkRow(existing as FeedbackVersionLink);
        return;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("feedback_version_links")
        .insert({ catalog_song_version_id: catalogSongVersionId })
        .select("*")
        .single();

      if (insErr) {
        const { data: again } = await supabase
          .from("feedback_version_links")
          .select("*")
          .eq("catalog_song_version_id", catalogSongVersionId)
          .maybeSingle();
        if (again) {
          setLinkRow(again as FeedbackVersionLink);
          return;
        }
        throw new Error(insErr.message);
      }
      setLinkRow(inserted as FeedbackVersionLink);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load share link.");
    } finally {
      setLoading(false);
    }
  }, [catalogSongVersionId]);

  useEffect(() => {
    if (open) void loadOrCreate();
  }, [open, loadOrCreate]);

  const shareUrl =
    linkRow && origin ? `${origin}/listen/${linkRow.token}` : "";

  const setEnabled = async (enabled: boolean) => {
    if (!linkRow) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: uErr } = await supabase
        .from("feedback_version_links")
        .update({ enabled })
        .eq("id", linkRow.id);
      if (uErr) throw new Error(uErr.message);
      setLinkRow({ ...linkRow, enabled });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update link.");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-share-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl"
        )}
      >
        <h2
          id="feedback-share-title"
          className="text-lg font-semibold text-white"
        >
          Ask for feedback
        </h2>
        <p className="mt-1 text-sm text-neutral-400">
          {songTitle}
          <span className="text-neutral-600"> · </span>
          {versionLabel}
        </p>

        {loading && (
          <p className="mt-6 text-sm text-neutral-500">Preparing link…</p>
        )}

        {!loading && error && (
          <p className="mt-4 text-sm text-red-300">{error}</p>
        )}

        {!loading && linkRow && (
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Share link
              </p>
              <div className="mt-1 flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[rgba(168,92,16,0.38)]"
                  style={{
                    background: S.bg,
                    borderColor: S.border,
                    color: S.textPrimary,
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void copyLink()}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={linkRow.enabled}
                disabled={saving}
                onChange={(e) => void setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border accent-[#a85c10]"
                style={{ borderColor: S.border }}
              />
              <span className="text-sm text-neutral-300">
                Link enabled (guests can listen and comment)
              </span>
            </label>

            <p className="text-xs text-neutral-500">
              Anyone with the link can listen and leave time-stamped notes. You
              always keep every comment on your Feedback page, even when the
              link is turned off.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
