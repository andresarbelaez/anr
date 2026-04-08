"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { MessageSquare, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  CatalogSong,
  CatalogSongVersion,
  FeedbackVersionLink,
} from "@/lib/supabase/types";
import { S } from "@/components/studio/ui/s";
import { useStudioWindowChrome } from "@/components/studio/studio-window-chrome";
import { StudioFeedbackDetailPanel } from "@/components/studio/windows/StudioFeedbackDetailPanel";
import { StudioMicroappSkeletonListRowsEmbedded } from "@/components/studio/ui/studio-microapp-skeletons";
import { useStudioMicroappSessionCacheOptional } from "@/contexts/studio-microapp-session-cache";

type LinkRow = FeedbackVersionLink & {
  catalog_song_versions: CatalogSongVersion & {
    catalog_songs: Pick<CatalogSong, "title"> | null;
  };
};

type RowUi = {
  versionId: string;
  songTitle: string;
  versionLabel: string;
  enabled: boolean;
  commentCount: number;
};

type StackEntry =
  | { type: "list" }
  | { type: "detail"; versionId: string };

function initialStack(
  initialDetailVersionId?: string | null
): {
  past: StackEntry[];
  current: StackEntry;
  future: StackEntry[];
} {
  if (initialDetailVersionId) {
    return {
      past: [{ type: "list" }],
      current: { type: "detail", versionId: initialDetailVersionId },
      future: [],
    };
  }
  return { past: [], current: { type: "list" }, future: [] };
}

const DETAIL_FALLBACK_TITLE = "Notes";

export function StudioFeedbackWindow({
  initialDetailVersionId = null,
}: {
  initialDetailVersionId?: string | null;
}) {
  const chrome = useStudioWindowChrome();
  const boot = initialStack(initialDetailVersionId);
  const [past, setPast] = useState<StackEntry[]>(boot.past);
  const [current, setCurrent] = useState<StackEntry>(boot.current);
  const [future, setFuture] = useState<StackEntry[]>(boot.future);
  const [detailTitle, setDetailTitle] = useState<string | null>(null);

  const appliedBootstrap = useRef<string | null>(
    initialDetailVersionId ?? null
  );

  useEffect(() => {
    if (!initialDetailVersionId) return;
    if (appliedBootstrap.current === initialDetailVersionId) return;
    appliedBootstrap.current = initialDetailVersionId;
    setPast([{ type: "list" }]);
    setCurrent({ type: "detail", versionId: initialDetailVersionId });
    setFuture([]);
    setDetailTitle(null);
  }, [initialDetailVersionId]);

  useEffect(() => {
    if (current.type !== "detail") return;
    setDetailTitle(null);
  }, [current]);

  const sessionCache = useStudioMicroappSessionCacheOptional();
  const [rows, setRows] = useState<RowUi[]>(
    () => (sessionCache?.takeFeedback() as RowUi[] | undefined) ?? []
  );
  const [loading, setLoading] = useState(
    () => (sessionCache ? sessionCache.takeFeedback() === null : true)
  );

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      return;
    }

    const { data: links, error } = await supabase
      .from("feedback_version_links")
      .select(
        `
        id, enabled, token, catalog_song_version_id,
        catalog_song_versions (
          id, label, file_name,
          catalog_songs ( title )
        )
      `
      )
      .order("updated_at", { ascending: false });

    if (error || !links) {
      setRows([]);
      return;
    }

    const parsed = links as unknown as LinkRow[];
    const counts = await Promise.all(
      parsed.map(async (l) => {
        const { count } = await supabase
          .from("feedback_comments")
          .select("*", { count: "exact", head: true })
          .eq("feedback_link_id", l.id);
        const v = l.catalog_song_versions;
        return {
          versionId: l.catalog_song_version_id,
          songTitle: v?.catalog_songs?.title ?? "Untitled",
          versionLabel: (v?.label?.trim() || v?.file_name || "Version").trim(),
          enabled: l.enabled,
          commentCount: count ?? 0,
        };
      })
    );
    setRows(counts);
    sessionCache?.putFeedback(counts);
  }, [sessionCache]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sessionCache ? sessionCache.takeFeedback() === null : true)
        setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load, sessionCache]);

  const goToDetail = useCallback((versionId: string) => {
    setDetailTitle(null);
    setPast((p) => [...p, current]);
    setCurrent({ type: "detail", versionId });
    setFuture([]);
  }, [current]);

  const goBack = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setFuture((f) => [current, ...f]);
    setCurrent(prev);
    setPast((p) => p.slice(0, -1));
    if (prev.type === "list") setDetailTitle(null);
  }, [past, current]);

  const goForward = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setPast((p) => [...p, current]);
    setCurrent(next);
    setFuture((f) => f.slice(1));
    if (next.type === "list") setDetailTitle(null);
  }, [future, current]);

  const canBack = past.length > 0;
  const canForward = future.length > 0;

  const chromeTitle = useMemo(() => {
    if (current.type === "list") return null;
    return detailTitle ?? DETAIL_FALLBACK_TITLE;
  }, [current.type, detailTitle]);

  useEffect(() => {
    chrome.setTitle(chromeTitle);
  }, [chrome, chromeTitle]);

  useEffect(() => {
    chrome.setNav({
      canBack,
      canForward,
      goBack,
      goForward,
    });
  }, [chrome, canBack, canForward, goBack, goForward]);

  const onMissingVersion = useCallback(() => {
    goBack();
  }, [goBack]);

  const onDetailMeta = useCallback(
    (meta: { songTitle: string; versionLabel: string }) => {
      const t = meta.songTitle.trim();
      setDetailTitle(t.length > 28 ? `${t.slice(0, 26)}…` : t);
    },
    []
  );

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: S.bg,
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {current.type === "list" ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: S.surface,
              borderBottom: `1px solid ${S.border}`,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: S.textSecondary,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Feedback
            </span>
            <span style={{ fontSize: 10, color: S.textFaint }}>
              via Library → Versions
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            {loading ? (
              <StudioMicroappSkeletonListRowsEmbedded rows={6} />
            ) : rows.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  paddingTop: 48,
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 8,
                    background: S.surface,
                    border: `1px solid ${S.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MessageSquare size={22} color={S.textFaint} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 500, color: S.textMuted }}>
                  No feedback yet
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: S.textFaint,
                    maxWidth: 240,
                    lineHeight: 1.6,
                  }}
                >
                  Open a song in Library and tap &quot;Share&quot; on a version
                  to create a shareable link.
                </p>
                <Link
                  href="/studio?open=library"
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: S.accent,
                    textDecoration: "none",
                    marginTop: 4,
                  }}
                >
                  Open Library
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rows.map((r) => (
                  <FeedbackRow key={r.versionId} row={r} onOpen={goToDetail} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <StudioFeedbackDetailPanel
          versionId={current.versionId}
          onMissingVersion={onMissingVersion}
          onLoadedMeta={onDetailMeta}
        />
      )}
    </div>
  );
}

function FeedbackRow({
  row: r,
  onOpen,
}: {
  row: RowUi;
  onOpen: (versionId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onOpen(r.versionId)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 4,
        border: `1px solid ${hovered ? S.borderAccent : S.border}`,
        background: hovered ? S.hover : S.surface,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: S.textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {r.songTitle}
        </p>
        <p
          style={{
            fontSize: 11,
            color: S.textMuted,
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {r.versionLabel}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            padding: "2px 7px",
            borderRadius: 2,
            background: r.enabled ? S.successBg : S.borderFaint,
            color: r.enabled ? S.success : S.textFaint,
          }}
        >
          {r.enabled ? "enabled" : "disabled"}
        </span>
        <span
          style={{
            fontSize: 11,
            color: S.textMuted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {r.commentCount} {r.commentCount === 1 ? "note" : "notes"}
        </span>
        <ChevronRight size={16} color={S.textFaint} />
      </div>
    </button>
  );
}
