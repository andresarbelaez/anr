"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, MessageCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { FeedbackVersionLink } from "@/lib/supabase/types";
import { cn } from "@/lib/utils/cn";
import { S } from "@/components/studio/ui/s";

/** Match `StudioDonateModal` / `StudioSignOutConfirmModal`. */
const MODAL_Z = 5300;

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: S.textSecondary,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: 6,
};

const fieldStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  fontSize: 12,
  color: S.textPrimary,
  background: S.bg,
  border: `1px solid ${S.border}`,
  borderRadius: 3,
  outline: "none",
};

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
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: MODAL_Z }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-share-title"
    >
      <Button
        type="button"
        variant="bare"
        disabled={saving}
        className="absolute inset-0 h-full min-h-full w-full cursor-pointer bg-[rgba(28,18,8,0.58)] hover:bg-[rgba(28,18,8,0.58)] disabled:cursor-wait"
        aria-label="Close dialog"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-lg border p-5 pt-4 shadow-xl"
        style={{
          background: S.surface,
          borderColor: S.border,
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
        }}
      >
        <Button
          type="button"
          variant="bare"
          disabled={saving}
          className="absolute right-2 top-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#8a6040] transition-colors hover:bg-black/[0.06] hover:text-[#5a3518] focus-visible:ring-2 focus-visible:ring-[#d4b896]/80 disabled:opacity-50"
          aria-label="Close"
          onClick={onClose}
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
        </Button>

        <div className="flex flex-col items-center text-center">
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border"
            style={{
              background: S.accentBg,
              borderColor: "rgba(168,92,16,0.35)",
            }}
          >
            <MessageCircle
              className="h-6 w-6"
              style={{ color: S.accent }}
              strokeWidth={2}
            />
          </div>
          <h2
            id="feedback-share-title"
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: S.textPrimary,
            }}
          >
            Ask for feedback
          </h2>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: S.textMuted,
              lineHeight: 1.55,
              maxWidth: 320,
            }}
          >
            {songTitle}
            <span style={{ color: S.textFaint }}> · </span>
            {versionLabel}
          </p>
        </div>

        {loading && (
          <p
            className="mt-5 text-center text-sm"
            style={{ color: S.textMuted }}
          >
            Preparing link…
          </p>
        )}

        {!loading && error && (
          <p
            className="mt-4 rounded-md px-3 py-2 text-center text-xs"
            style={{
              background: S.errorBg,
              color: S.error,
              border: `1px solid ${S.error}`,
            }}
          >
            {error}
          </p>
        )}

        {!loading && linkRow && (
          <div className="mt-5 space-y-4">
            <div>
              <span style={labelStyle}>Share link</span>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="min-w-0 flex-1 focus:ring-2 focus:ring-[rgba(168,92,16,0.38)]"
                  style={fieldStyle}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outlineSoft"
                  className={cn(
                    "!shrink-0 gap-1.5 !rounded-sm !border-[#d4b896] !text-[#5a3518] hover:!bg-black/[0.04] [&_svg]:shrink-0"
                  )}
                  onClick={() => void copyLink()}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="feedback-share-enabled"
                className="cursor-pointer text-sm"
                style={{ color: S.textSecondary }}
              >
                Link enabled (guests can listen and comment)
              </label>
              <Switch
                id="feedback-share-enabled"
                checked={linkRow.enabled}
                disabled={saving}
                onCheckedChange={(checked) => void setEnabled(checked)}
              />
            </div>

            <p
              className="text-center text-[10px] leading-relaxed"
              style={{ color: S.textFaint }}
            >
              Anyone with the link can listen and leave time-stamped notes. You
              always keep every comment on your Feedback page, even when the
              link is turned off.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
