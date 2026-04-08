"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DollarSign, TrendingUp, Disc3, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Royalty, Release } from "@/lib/supabase/types";
import { S } from "@/components/studio/ui/s";
import { useStudioWindowChrome } from "@/components/studio/studio-window-chrome";
import { StudioMicroappSkeletonRoyaltiesEmbedded } from "@/components/studio/ui/studio-microapp-skeletons";
import { useStudioMicroappSessionCacheOptional } from "@/contexts/studio-microapp-session-cache";

interface AggregatedDsp {
  dsp: string;
  streams: number;
  earnings: number;
}

const DSP_COLOR: Record<string, string> = {
  Spotify: "#1db954",
  "Apple Music": "#fa243c",
  "Amazon Music": "#00a8e1",
  Tidal: "#00ffff",
  Deezer: "#a238ff",
  "YouTube Music": "#ff0000",
};

type RoyaltiesStackEntry =
  | { type: "list" }
  | { type: "detail"; releaseId: string };

function initialRoyaltiesStack(initialReleaseId?: string | null): {
  past: RoyaltiesStackEntry[];
  current: RoyaltiesStackEntry;
  future: RoyaltiesStackEntry[];
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

function aggregateByDsp(rows: Royalty[]): AggregatedDsp[] {
  return Object.values(
    rows.reduce<Record<string, AggregatedDsp>>((acc, r) => {
      if (!acc[r.dsp_name]) {
        acc[r.dsp_name] = { dsp: r.dsp_name, streams: 0, earnings: 0 };
      }
      acc[r.dsp_name].streams += r.stream_count;
      acc[r.dsp_name].earnings += Number(r.earnings_amount);
      return acc;
    }, {})
  ).sort((a, b) => b.earnings - a.earnings);
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 140px",
        background: S.surface,
        border: `1px solid ${S.border}`,
        borderRadius: 4,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 8,
        }}
      >
        {icon}
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: S.textMuted,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      <p
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: S.textPrimary,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </p>
    </div>
  );
}

const ROYALTIES_DETAIL_FALLBACK = "Release";

export function StudioRoyaltiesWindow({
  initialRoyaltiesReleaseId = null,
}: {
  initialRoyaltiesReleaseId?: string | null;
}) {
  const chrome = useStudioWindowChrome();
  const boot = initialRoyaltiesStack(initialRoyaltiesReleaseId);
  const [past, setPast] = useState<RoyaltiesStackEntry[]>(boot.past);
  const [current, setCurrent] = useState<RoyaltiesStackEntry>(boot.current);
  const [future, setFuture] = useState<RoyaltiesStackEntry[]>(boot.future);
  const [detailTitle, setDetailTitle] = useState<string | null>(null);

  const appliedBootstrap = useRef<string | null>(
    initialRoyaltiesReleaseId ?? null
  );
  useEffect(() => {
    if (!initialRoyaltiesReleaseId) return;
    if (appliedBootstrap.current === initialRoyaltiesReleaseId) return;
    appliedBootstrap.current = initialRoyaltiesReleaseId;
    setPast([{ type: "list" }]);
    setCurrent({
      type: "detail",
      releaseId: initialRoyaltiesReleaseId,
    });
    setFuture([]);
    setDetailTitle(null);
  }, [initialRoyaltiesReleaseId]);

  useEffect(() => {
    if (current.type !== "detail") return;
    setDetailTitle(null);
  }, [current]);

  const goToDetail = useCallback(
    (releaseId: string) => {
      setDetailTitle(null);
      setPast((p) => [...p, current]);
      setCurrent({ type: "detail", releaseId });
      setFuture([]);
    },
    [current]
  );

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
    return detailTitle ?? ROYALTIES_DETAIL_FALLBACK;
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

  const sessionCache = useStudioMicroappSessionCacheOptional();
  const [royalties, setRoyalties] = useState<Royalty[]>(
    () => sessionCache?.takeRoyalties()?.royalties ?? []
  );
  const [releases, setReleases] = useState<Release[]>(
    () => sessionCache?.takeRoyalties()?.releases ?? []
  );
  const [loading, setLoading] = useState(
    () => (sessionCache ? sessionCache.takeRoyalties() === null : true)
  );

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: rels }, { data: roys }] = await Promise.all([
      supabase.from("releases").select("*").eq("status", "live"),
      supabase.from("royalties").select("*").order("created_at", { ascending: false }),
    ]);
    const relList = (rels as Release[]) || [];
    const royList = (roys as Royalty[]) || [];
    setReleases(relList);
    setRoyalties(royList);
    sessionCache?.putRoyalties(relList, royList);
  }, [sessionCache]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sessionCache ? sessionCache.takeRoyalties() === null : true)
        setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load, sessionCache]);

  const aggregatedByDsp = useMemo(
    () => aggregateByDsp(royalties),
    [royalties]
  );

  const totalEarnings = useMemo(
    () => aggregatedByDsp.reduce((s, d) => s + d.earnings, 0),
    [aggregatedByDsp]
  );
  const totalStreams = useMemo(
    () => aggregatedByDsp.reduce((s, d) => s + d.streams, 0),
    [aggregatedByDsp]
  );
  const maxStreams = useMemo(
    () => Math.max(...aggregatedByDsp.map((d) => d.streams), 1),
    [aggregatedByDsp]
  );

  const perReleaseStats = useMemo(() => {
    const map = new Map<
      string,
      { releaseId: string; earnings: number; streams: number }
    >();
    for (const r of releases) {
      map.set(r.id, { releaseId: r.id, earnings: 0, streams: 0 });
    }
    for (const row of royalties) {
      const cur = map.get(row.release_id);
      if (!cur) continue;
      cur.earnings += Number(row.earnings_amount);
      cur.streams += row.stream_count;
    }
    return releases.map((rel) => {
      const s = map.get(rel.id)!;
      return { release: rel, earnings: s.earnings, streams: s.streams };
    });
  }, [releases, royalties]);

  const onReleaseMeta = useCallback((title: string) => {
    const t = title.trim();
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
              Royalties
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {loading ? (
              <StudioMicroappSkeletonRoyaltiesEmbedded />
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 20,
                  }}
                >
                  <StatCard
                    icon={<DollarSign size={14} color={S.accent} />}
                    label="Earnings"
                    value={`$${totalEarnings.toFixed(2)}`}
                  />
                  <StatCard
                    icon={<TrendingUp size={14} color={S.accent} />}
                    label="Streams"
                    value={totalStreams.toLocaleString()}
                  />
                  <StatCard
                    icon={<Disc3 size={14} color={S.accent} />}
                    label="Live"
                    value={String(releases.length)}
                  />
                </div>

                {perReleaseStats.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                        color: S.textMuted,
                        marginBottom: 10,
                      }}
                    >
                      Live releases
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {perReleaseStats.map(({ release, earnings, streams }) => (
                        <button
                          key={release.id}
                          type="button"
                          onClick={() => goToDetail(release.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            padding: "12px 14px",
                            borderRadius: 4,
                            border: `1px solid ${S.border}`,
                            background: S.surface,
                            cursor: "pointer",
                            textAlign: "left",
                            width: "100%",
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: S.textPrimary,
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {release.title}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: S.textMuted,
                                marginTop: 2,
                                display: "block",
                              }}
                            >
                              {streams.toLocaleString()} streams · $
                              {earnings.toFixed(2)}
                            </span>
                          </div>
                          <ChevronRight size={16} color={S.textFaint} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {aggregatedByDsp.length > 0 ? (
                  <div
                    style={{
                      background: S.surface,
                      border: `1px solid ${S.border}`,
                      borderRadius: 4,
                      padding: "16px 18px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                        color: S.textMuted,
                        marginBottom: 14,
                      }}
                    >
                      By platform (all releases)
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      {aggregatedByDsp.map((entry) => {
                        const barColor = DSP_COLOR[entry.dsp] ?? S.accent;
                        const pct = (entry.streams / maxStreams) * 100;
                        return (
                          <div key={entry.dsp}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 5,
                              }}
                            >
                              <span
                                style={{ fontSize: 12, color: S.textPrimary }}
                              >
                                {entry.dsp}
                              </span>
                              <div
                                style={{
                                  display: "flex",
                                  gap: 18,
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{ fontSize: 11, color: S.textMuted }}
                                >
                                  {entry.streams.toLocaleString()} streams
                                </span>
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: S.accent,
                                  }}
                                >
                                  ${entry.earnings.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div
                              style={{
                                height: 6,
                                borderRadius: 3,
                                background: S.borderFaint,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  borderRadius: 3,
                                  background: barColor,
                                  transition: "width 0.4s ease",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "32px 0" }}>
                    <p
                      style={{
                        fontSize: 12,
                        color: S.textFaint,
                        lineHeight: 1.7,
                      }}
                    >
                      No royalty data yet.
                      <br />
                      Earnings appear once your releases start streaming.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <RoyaltiesReleaseDetail
          releaseId={current.releaseId}
          releases={releases}
          allRoyalties={royalties}
          onLoadedTitle={onReleaseMeta}
        />
      )}
    </div>
  );
}

function RoyaltiesReleaseDetail({
  releaseId,
  releases,
  allRoyalties,
  onLoadedTitle,
}: {
  releaseId: string;
  releases: Release[];
  allRoyalties: Royalty[];
  onLoadedTitle: (title: string) => void;
}) {
  const release = releases.find((r) => r.id === releaseId) ?? null;
  const rows = useMemo(
    () => allRoyalties.filter((r) => r.release_id === releaseId),
    [allRoyalties, releaseId]
  );
  const byDsp = useMemo(() => aggregateByDsp(rows), [rows]);
  const maxStreams = Math.max(...byDsp.map((d) => d.streams), 1);
  const totalEarnings = byDsp.reduce((s, d) => s + d.earnings, 0);
  const totalStreams = byDsp.reduce((s, d) => s + d.streams, 0);

  useEffect(() => {
    if (release?.title) onLoadedTitle(release.title);
  }, [release, onLoadedTitle]);

  if (!release) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: S.textMuted }}>
        Release not found or no longer live.
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: S.textPrimary,
            margin: 0,
          }}
        >
          {release.title}
        </h2>
        <p style={{ fontSize: 11, color: S.textMuted, margin: "6px 0 0" }}>
          Royalty breakdown for this release
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <StatCard
          icon={<DollarSign size={14} color={S.accent} />}
          label="Earnings"
          value={`$${totalEarnings.toFixed(2)}`}
        />
        <StatCard
          icon={<TrendingUp size={14} color={S.accent} />}
          label="Streams"
          value={totalStreams.toLocaleString()}
        />
      </div>

      {byDsp.length > 0 ? (
        <div
          style={{
            background: S.surface,
            border: `1px solid ${S.border}`,
            borderRadius: 4,
            padding: "16px 18px",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: S.textMuted,
              marginBottom: 14,
            }}
          >
            By platform
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {byDsp.map((entry) => {
              const barColor = DSP_COLOR[entry.dsp] ?? S.accent;
              const pct = (entry.streams / maxStreams) * 100;
              return (
                <div key={entry.dsp}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 5,
                    }}
                  >
                    <span style={{ fontSize: 12, color: S.textPrimary }}>
                      {entry.dsp}
                    </span>
                    <div
                      style={{ display: "flex", gap: 18, alignItems: "center" }}
                    >
                      <span style={{ fontSize: 11, color: S.textMuted }}>
                        {entry.streams.toLocaleString()} streams
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: S.accent,
                        }}
                      >
                        ${entry.earnings.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: S.borderFaint,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        borderRadius: 3,
                        background: barColor,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: S.textFaint, lineHeight: 1.6 }}>
          No royalty rows for this release yet.
        </p>
      )}
    </div>
  );
}
