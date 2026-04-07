"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Music, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Release } from "@/lib/supabase/types";
import { S } from "@/components/studio/ui/s";
import { StudioMicroappNewButton } from "@/components/studio/ui/StudioMicroappNewButton";
import { useStudioWindowChrome } from "@/components/studio/studio-window-chrome";
import { StudioReleaseDetailPanel } from "@/components/studio/windows/StudioReleaseDetailPanel";
import { StudioNewReleasePanel } from "@/components/studio/StudioNewReleasePanel";

type StackEntry =
  | { type: "list" }
  | { type: "new" }
  | { type: "detail"; releaseId: string };

function initialStack(initialReleaseId?: string | null): {
  past: StackEntry[];
  current: StackEntry;
  future: StackEntry[];
} {
  if (initialReleaseId) {
    return {
      past: [{ type: "list" }],
      current: { type: "detail", releaseId: initialReleaseId },
      future: [],
    };
  }
  return { past: [], current: { type: "list" }, future: [] };
}

function Spinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 48,
      }}
    >
      <div
        className="animate-spin"
        style={{
          width: 22,
          height: 22,
          border: `2px solid ${S.border}`,
          borderTopColor: S.accent,
          borderRadius: "50%",
        }}
      />
    </div>
  );
}

function StatusPip({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    live: { bg: S.accentBg, color: S.accent },
    scheduled: { bg: S.successBg, color: S.success },
    draft: { bg: "rgba(155,119,61,0.15)", color: S.textMuted },
    takedown: { bg: S.errorBg, color: S.error },
  };
  const style = map[status] ?? { bg: S.borderFaint, color: S.textFaint };
  return (
    <span
      style={{
        fontSize: 10,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        background: style.bg,
        color: style.color,
        padding: "2px 6px",
        borderRadius: 2,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {status}
    </span>
  );
}

const DETAIL_FALLBACK = "Release";

export function StudioReleasesWindow({
  initialReleaseId = null,
}: {
  initialReleaseId?: string | null;
}) {
  const chrome = useStudioWindowChrome();
  const boot = initialStack(initialReleaseId);
  const [past, setPast] = useState<StackEntry[]>(boot.past);
  const [current, setCurrent] = useState<StackEntry>(boot.current);
  const [future, setFuture] = useState<StackEntry[]>(boot.future);
  const [detailTitle, setDetailTitle] = useState<string | null>(null);

  const appliedBootstrap = useRef<string | null>(initialReleaseId ?? null);
  useEffect(() => {
    if (!initialReleaseId) return;
    if (appliedBootstrap.current === initialReleaseId) return;
    appliedBootstrap.current = initialReleaseId;
    setPast([{ type: "list" }]);
    setCurrent({ type: "detail", releaseId: initialReleaseId });
    setFuture([]);
    setDetailTitle(null);
  }, [initialReleaseId]);

  useEffect(() => {
    if (current.type !== "detail") return;
    setDetailTitle(null);
  }, [current]);

  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWizardKey, setNewWizardKey] = useState(0);
  const [wizardBusy, setWizardBusy] = useState(false);

  const loadReleases = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("releases")
      .select("*")
      .order("created_at", { ascending: false });
    setReleases((data as Release[]) || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadReleases();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadReleases]);

  const goToDetail = useCallback(
    (releaseId: string) => {
      setDetailTitle(null);
      setPast((p) => [...p, current]);
      setCurrent({ type: "detail", releaseId });
      setFuture([]);
    },
    [current]
  );

  /** From stack “new” screen: land on detail without leaving “new” in history. */
  const handleNewReleaseCreated = useCallback(
    async (releaseId: string) => {
      await loadReleases();
      setFuture([]);
      setDetailTitle(null);
      setCurrent({ type: "detail", releaseId });
    },
    [loadReleases]
  );

  const goToNew = useCallback(() => {
    setDetailTitle(null);
    setPast((p) => [...p, current]);
    setCurrent({ type: "new" });
    setFuture([]);
    setNewWizardKey((k) => k + 1);
  }, [current]);

  const goBack = useCallback(() => {
    if (past.length === 0) return;
    if (current.type === "new" && wizardBusy) return;
    const prev = past[past.length - 1];
    setFuture((f) => [current, ...f]);
    setCurrent(prev);
    setPast((p) => p.slice(0, -1));
    if (prev.type === "list") setDetailTitle(null);
  }, [past, current, wizardBusy]);

  const goForward = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setPast((p) => [...p, current]);
    setCurrent(next);
    setFuture((f) => f.slice(1));
    if (next.type === "list") setDetailTitle(null);
  }, [future, current]);

  const canBack =
    past.length > 0 && !(current.type === "new" && wizardBusy);
  const canForward = future.length > 0;

  useEffect(() => {
    if (current.type !== "new") setWizardBusy(false);
  }, [current.type]);

  const chromeTitle = useMemo(() => {
    if (current.type === "list") return null;
    if (current.type === "new") return "New release";
    return detailTitle ?? DETAIL_FALLBACK;
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

  const onMissingRelease = useCallback(() => {
    goBack();
  }, [goBack]);

  const onReleaseMeta = useCallback((meta: { title: string }) => {
    const t = meta.title.trim();
    setDetailTitle(t.length > 28 ? `${t.slice(0, 26)}…` : t);
  }, []);

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
              Releases
            </span>
            <StudioMicroappNewButton label="New release" onClick={goToNew} />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            {loading ? (
              <Spinner />
            ) : releases.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  paddingTop: 48,
                  paddingBottom: 24,
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
                  <Music size={22} color={S.textFaint} />
                </div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: S.textMuted,
                  }}
                >
                  No releases yet
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: S.textFaint,
                    maxWidth: 240,
                    lineHeight: 1.6,
                  }}
                >
                  Upload your first track and distribute it to Spotify, Apple
                  Music, and 150+ platforms.
                </p>
                <div style={{ marginTop: 4 }}>
                  <StudioMicroappNewButton label="New release" onClick={goToNew} />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {releases.map((r) => (
                  <ReleaseRow
                    key={r.id}
                    release={r}
                    onOpen={() => goToDetail(r.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : current.type === "new" ? (
        <StudioNewReleasePanel
          wizardKey={newWizardKey}
          onBusyChange={setWizardBusy}
          onCancel={goBack}
          onCreated={handleNewReleaseCreated}
        />
      ) : (
        <StudioReleaseDetailPanel
          releaseId={current.releaseId}
          onMissingRelease={onMissingRelease}
          onLoadedMeta={onReleaseMeta}
        />
      )}
    </div>
  );
}

function ReleaseRow({
  release: r,
  onOpen,
}: {
  release: Release;
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "flex",
        gap: 12,
        padding: 12,
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
      <div
        style={{
          width: 60,
          height: 60,
          flexShrink: 0,
          borderRadius: 3,
          overflow: "hidden",
          background: S.surfaceAlt,
          border: `1px solid ${S.borderFaint}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {r.cover_art_url ? (
          <img
            src={r.cover_art_url}
            alt={r.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Music size={20} color={S.textFaint} />
        )}
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: S.textPrimary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {r.title}
          </span>
          <StatusPip status={r.status} />
        </div>
        <span
          style={{
            fontSize: 11,
            color: S.textMuted,
            textTransform: "capitalize",
          }}
        >
          {r.type}
          {r.genre && <> · {r.genre}</>}
        </span>
        {r.release_date && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10,
              color: S.textFaint,
            }}
          >
            <Calendar size={11} color={S.textFaint} />
            {new Date(r.release_date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        )}
      </div>
    </button>
  );
}
