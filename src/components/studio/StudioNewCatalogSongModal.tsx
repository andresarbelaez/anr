"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Release } from "@/lib/supabase/types";
import { S } from "@/components/studio/ui/s";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  /** After insert succeeds; typically reload catalog and open the new song detail. */
  onCreated: (songId: string) => void | Promise<void>;
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: S.textSecondary,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  marginBottom: 6,
};

const fieldStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  fontSize: 13,
  color: S.textPrimary,
  background: S.bg,
  border: `1px solid ${S.border}`,
  borderRadius: 3,
  outline: "none",
};

export function StudioNewCatalogSongModal({ open, onClose, onCreated }: Props) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [title, setTitle] = useState("");
  const [releaseId, setReleaseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("releases")
        .select("*")
        .order("created_at", { ascending: false });
      if (!cancelled) setReleases((data as Release[]) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setReleaseId("");
      setError(null);
      setSaving(false);
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("catalog_songs")
      .insert({
        user_id: user.id,
        title: title.trim(),
        release_id: releaseId || null,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    try {
      await onCreated(data.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2400] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-new-song-title"
    >
      <Button
        type="button"
        variant="bare"
        disabled={saving}
        className="absolute inset-0 h-full min-h-full w-full cursor-pointer bg-[rgba(28,18,8,0.58)] hover:bg-[rgba(28,18,8,0.58)] disabled:cursor-default"
        aria-label="Close dialog"
        onClick={() => {
          if (!saving) onClose();
        }}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-lg border p-5 shadow-xl"
        style={{
          background: S.surface,
          borderColor: S.border,
          boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
        }}
      >
        <h2
          id="studio-new-song-title"
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: S.textPrimary,
            margin: 0,
          }}
        >
          New song
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: S.textMuted, lineHeight: 1.5 }}>
          Add MP3 versions on the next screen after you create the song.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ marginTop: 20 }}>
          {error && (
            <div
              style={{
                marginBottom: 12,
                padding: "8px 10px",
                borderRadius: 3,
                fontSize: 12,
                background: S.errorBg,
                color: S.error,
                border: `1px solid ${S.error}`,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label htmlFor="studio-new-song-title-input" style={labelStyle}>
              Title
            </label>
            <input
              id="studio-new-song-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={saving}
              style={fieldStyle}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label htmlFor="studio-new-song-release" style={labelStyle}>
              Related release (optional)
            </label>
            <select
              id="studio-new-song-release"
              value={releaseId}
              onChange={(e) => setReleaseId(e.target.value)}
              disabled={saving}
              style={{ ...fieldStyle, cursor: saving ? "not-allowed" : "pointer" }}
            >
              <option value="">None</option>
              {releases.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.status})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button
              type="button"
              variant="outlineSoft"
              size="sm"
              disabled={saving}
              onClick={onClose}
              className="!rounded-sm !border-[#d4b896] !text-xs !font-medium text-[#5a3518]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="studioAccent"
              size="sm"
              disabled={saving}
              loading={saving}
              className="!rounded-sm !px-3.5 !text-xs !font-semibold"
            >
              Create song
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
