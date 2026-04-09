"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  Disc3,
  ListMusic,
  Download,
  Upload,
  Trash2,
  Link as LinkIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CatalogSong, CatalogSongVersion, Release } from "@/lib/supabase/types";
import { S } from "@/components/studio/ui/s";
import { useStudioWindowChrome } from "@/components/studio/studio-window-chrome";
import { StudioCatalogEditPanel } from "@/components/studio/windows/StudioCatalogEditPanel";
import { MicroappAudioPlayerBar } from "@/components/audio/MicroappAudioPlayerBar";
import { studioMicroappAudioBarSharedEmbedProps } from "@/components/audio/microapp-audio-player-theme";
import { useCatalogPlayer } from "@/contexts/catalog-player-context";
import { FeedbackShareModal } from "@/components/feedback/FeedbackShareModal";
import {
  downloadCsv,
  getCell,
  isUuid,
  parseCsvRecords,
} from "@/lib/utils/csv-io";
import { CATALOG_MP3_BUCKET } from "@/lib/utils/catalog-mp3";
import { catalogVersionRowLabel } from "@/lib/utils/catalog-version-display";
import { CatalogVersionDeleteModal } from "@/components/catalog/CatalogVersionDeleteModal";
import { CatalogVersionDownloadModal } from "@/components/catalog/CatalogVersionDownloadModal";
import { StudioNewCatalogSongModal } from "@/components/studio/StudioNewCatalogSongModal";
import { StudioMicroappPrimaryButton } from "@/components/studio/ui/StudioMicroappPrimaryButton";
import { Button } from "@/components/ui/button";
import { useStudioMobileLayout } from "@/lib/studio/use-studio-mobile-layout";
import { StudioMicroappSkeletonListRowsEmbedded } from "@/components/studio/ui/studio-microapp-skeletons";
import { useStudioMicroappSessionCacheOptional } from "@/contexts/studio-microapp-session-cache";
import { cn } from "@/lib/utils/cn";

type SongRow = CatalogSong & { releaseTitle: string | null };

type LibStackEntry =
  | { type: "list" }
  | { type: "detail"; songId: string };

function initialLibStack(initialSongId?: string | null): {
  past: LibStackEntry[];
  current: LibStackEntry;
  future: LibStackEntry[];
} {
  if (initialSongId) {
    return {
      past: [{ type: "list" }],
      current: { type: "detail", songId: initialSongId },
      future: [],
    };
  }
  return { past: [], current: { type: "list" }, future: [] };
}

// ── IO banner ─────────────────────────────────────────────────────────────

function IoBanner({ msg }: { msg: { kind: "success" | "error"; text: string } | null }) {
  if (!msg) return null;
  return (
    <div
      style={{
        margin: "8px 0",
        padding: "8px 12px",
        borderRadius: 3,
        fontSize: 11,
        background: msg.kind === "error" ? S.errorBg : S.successBg,
        color: msg.kind === "error" ? S.error : S.success,
        border: `1px solid ${msg.kind === "error" ? S.error : S.success}`,
        opacity: 0.9,
      }}
    >
      {msg.text}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

const LIB_DETAIL_FALLBACK = "Edit song";

export function StudioLibraryWindow({
  initialSongId = null,
}: {
  initialSongId?: string | null;
}) {
  const chrome = useStudioWindowChrome();
  const boot = initialLibStack(initialSongId);
  const [past, setPast] = useState<LibStackEntry[]>(boot.past);
  const [current, setCurrent] = useState<LibStackEntry>(boot.current);
  const [future, setFuture] = useState<LibStackEntry[]>(boot.future);
  const [detailTitle, setDetailTitle] = useState<string | null>(null);

  const appliedBootstrap = useRef<string | null>(initialSongId ?? null);
  useEffect(() => {
    if (!initialSongId) return;
    if (appliedBootstrap.current === initialSongId) return;
    appliedBootstrap.current = initialSongId;
    setPast([{ type: "list" }]);
    setCurrent({ type: "detail", songId: initialSongId });
    setFuture([]);
    setDetailTitle(null);
  }, [initialSongId]);

  useEffect(() => {
    if (current.type !== "detail") return;
    setDetailTitle(null);
  }, [current]);

  const sessionCache = useStudioMicroappSessionCacheOptional();
  const [songs, setSongs] = useState<SongRow[]>(
    () => sessionCache?.takeLibrary()?.songs ?? []
  );
  const [versionsBySong, setVersionsBySong] = useState<
    Record<string, CatalogSongVersion[]>
  >(() => sessionCache?.takeLibrary()?.versionsBySong ?? {});
  const [loading, setLoading] = useState(
    () => (sessionCache ? sessionCache.takeLibrary() === null : true)
  );
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [ioMessage, setIoMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [shareVersion, setShareVersion] = useState<{
    versionId: string; songTitle: string; versionLabel: string;
  } | null>(null);
  const [versionBusyId, setVersionBusyId] = useState<string | null>(null);
  const [versionDeleteTarget, setVersionDeleteTarget] = useState<{
    song: SongRow;
    v: CatalogSongVersion;
  } | null>(null);
  const [versionDownloadTarget, setVersionDownloadTarget] = useState<{
    song: SongRow;
    v: CatalogSongVersion;
  } | null>(null);
  const [downloadModalBusy, setDownloadModalBusy] = useState(false);
  const [newSongModalOpen, setNewSongModalOpen] = useState(false);

  const goToDetail = useCallback(
    (songId: string) => {
      setDetailTitle(null);
      setPast((p) => [...p, current]);
      setCurrent({ type: "detail", songId });
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
    return detailTitle ?? LIB_DETAIL_FALLBACK;
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

  const onMissingSong = useCallback(() => {
    goBack();
  }, [goBack]);

  const onSongMeta = useCallback((meta: { title: string }) => {
    const t = meta.title.trim();
    setDetailTitle(t.length > 28 ? `${t.slice(0, 26)}…` : t);
  }, []);

  const {
    playCatalogVersion,
    activeTrack,
    playerLoading,
    playerError,
    clearCatalogPlayer,
    shouldAutoplayStudioLibraryEmbed,
    libraryAudioPlaying,
    toggleLibraryAudio,
    registerLibraryAudioToggle,
    reportLibraryAudioPlaying,
  } = useCatalogPlayer();

  const libraryAudioListSync = useMemo(
    () => ({
      registerToggle: registerLibraryAudioToggle,
      onPlayingChange: reportLibraryAudioPlaying,
    }),
    [registerLibraryAudioToggle, reportLibraryAudioPlaying]
  );

  const layoutMobile = useStudioMobileLayout();
  /** Bottom bar only on desktop shell; omit while layout is still `undefined` (no double player). */
  const showBottomLibraryPlayer = layoutMobile === false;

  const loadCatalog = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSongs([]);
      setVersionsBySong({});
      sessionCache?.putLibrary([], {});
      return;
    }

    const { data: songRows } = await supabase
      .from("catalog_songs")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    const songsData = (songRows as CatalogSong[]) || [];
    const releaseIds = [...new Set(songsData.map((s) => s.release_id).filter(Boolean))] as string[];

    let releaseMap: Record<string, string> = {};
    if (releaseIds.length) {
      const { data: rels } = await supabase.from("releases").select("id,title").in("id", releaseIds);
      releaseMap = Object.fromEntries(((rels as Pick<Release, "id" | "title">[]) || []).map((r) => [r.id, r.title]));
    }

    const withTitles: SongRow[] = songsData.map((s) => ({
      ...s, releaseTitle: s.release_id ? releaseMap[s.release_id] ?? null : null,
    }));

    const songIds = songsData.map((s) => s.id);
    const versMap: Record<string, CatalogSongVersion[]> = {};
    if (songIds.length) {
      const { data: vers } = await supabase
        .from("catalog_song_versions")
        .select("*")
        .in("catalog_song_id", songIds)
        .order("created_at", { ascending: true });
      for (const v of (vers as CatalogSongVersion[]) || []) {
        if (!versMap[v.catalog_song_id]) versMap[v.catalog_song_id] = [];
        versMap[v.catalog_song_id].push(v);
      }
    }

    setSongs(withTitles);
    setVersionsBySong(versMap);
    sessionCache?.putLibrary(withTitles, versMap);
  }, [sessionCache]);

  const handleNewSongCreated = useCallback(
    async (songId: string) => {
      await loadCatalog();
      goToDetail(songId);
    },
    [loadCatalog, goToDetail]
  );

  const downloadCatalogVersionToDevice = useCallback(
    async (v: CatalogSongVersion): Promise<boolean> => {
      setIoMessage(null);
      const supabase = createClient();
      const { data: blob, error: dErr } = await supabase.storage
        .from(CATALOG_MP3_BUCKET)
        .download(v.storage_path);

      if (dErr || !blob) {
        setIoMessage({
          kind: "error",
          text: dErr?.message ?? "Could not download file.",
        });
        return false;
      }

      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = v.file_name?.trim() || "audio";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return true;
      } catch {
        setIoMessage({
          kind: "error",
          text: "Could not save the file. Try again from the song edit page.",
        });
        return false;
      }
    },
    []
  );

  const confirmDownloadVersion = useCallback(async () => {
    if (!versionDownloadTarget) return;
    setDownloadModalBusy(true);
    try {
      const ok = await downloadCatalogVersionToDevice(versionDownloadTarget.v);
      if (ok) setVersionDownloadTarget(null);
    } finally {
      setDownloadModalBusy(false);
    }
  }, [versionDownloadTarget, downloadCatalogVersionToDevice]);

  const confirmDeleteVersion = useCallback(async () => {
    if (!versionDeleteTarget) return;
    const { song, v } = versionDeleteTarget;
    const label = v.label || v.file_name;

    setIoMessage(null);
    setVersionBusyId(v.id);
    try {
      const supabase = createClient();
      const { error: stErr } = await supabase.storage
        .from(CATALOG_MP3_BUCKET)
        .remove([v.storage_path]);
      if (stErr) {
        setIoMessage({ kind: "error", text: stErr.message });
        return;
      }
      const { error: dErr } = await supabase
        .from("catalog_song_versions")
        .delete()
        .eq("id", v.id);
      if (dErr) {
        setIoMessage({ kind: "error", text: dErr.message });
        return;
      }

      const playingLabel = activeTrack?.versionLabel;
      if (
        activeTrack &&
        activeTrack.songTitle === song.title &&
        playingLabel === label
      ) {
        clearCatalogPlayer();
      }
      setVersionDeleteTarget(null);
      await loadCatalog();
    } finally {
      setVersionBusyId(null);
    }
  }, [
    versionDeleteTarget,
    activeTrack,
    clearCatalogPlayer,
    loadCatalog,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sessionCache ? sessionCache.takeLibrary() === null : true)
        setLoading(true);
      await loadCatalog();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCatalog, sessionCache]);

  // ── CSV export ──────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    setIoMessage(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");
      const { data: songRows, error } = await supabase.from("catalog_songs").select("*").eq("user_id", user.id).order("title");
      if (error) throw new Error(error.message);

      const songsData = (songRows as CatalogSong[]) || [];
      const releaseIds = [...new Set(songsData.map((s) => s.release_id).filter(Boolean))] as string[];
      let releaseMap: Record<string, string> = {};
      if (releaseIds.length) {
        const { data: rels } = await supabase.from("releases").select("id,title").in("id", releaseIds);
        releaseMap = Object.fromEntries(((rels as Pick<Release, "id" | "title">[]) || []).map((r) => [r.id, r.title]));
      }
      const songIds = songsData.map((s) => s.id);
      const versMap: Record<string, CatalogSongVersion[]> = {};
      if (songIds.length) {
        const { data: vers } = await supabase.from("catalog_song_versions").select("*").in("catalog_song_id", songIds).order("created_at", { ascending: true });
        for (const v of (vers as CatalogSongVersion[]) || []) {
          if (!versMap[v.catalog_song_id]) versMap[v.catalog_song_id] = [];
          versMap[v.catalog_song_id].push(v);
        }
      }
      const exportRows = songsData.map((s) => ({
        title: s.title,
        release_id: s.release_id ?? "",
        release_title: s.release_id ? releaseMap[s.release_id] ?? "" : "",
        versions_json: JSON.stringify((versMap[s.id] || []).map((v) => ({ label: v.label, file_name: v.file_name }))),
      }));
      downloadCsv(`sidestage-catalog-export-${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
    } catch (e) {
      setIoMessage({ kind: "error", text: e instanceof Error ? e.message : "Export failed." });
    } finally { setExporting(false); }
  };

  // ── CSV import ──────────────────────────────────────────────────────────

  const handleImport = async (file: File) => {
    setImporting(true);
    setIoMessage(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");
      const { data: rels } = await supabase.from("releases").select("id,title").eq("user_id", user.id);
      const titleToReleaseId = new Map<string, string>();
      for (const r of (rels as Pick<Release, "id" | "title">[]) || []) titleToReleaseId.set(r.title.trim().toLowerCase(), r.id);

      const records = await parseCsvRecords(file);
      if (records.length === 0) { setIoMessage({ kind: "error", text: "No rows found in CSV." }); return; }

      let created = 0, skipped = 0;
      const errors: string[] = [];
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2;
        const title = getCell(row, "title", "song", "song_title", "name");
        if (!title) { skipped++; errors.push(`Row ${rowNum}: missing title, skipped.`); continue; }
        let releaseId: string | null = null;
        const ridRaw = getCell(row, "release_id", "release id");
        if (ridRaw && isUuid(ridRaw)) {
          const ok = (rels as Release[] | null)?.some((r) => r.id === ridRaw);
          if (ok) releaseId = ridRaw;
          else errors.push(`Row ${rowNum}: release_id not found, ignored.`);
        }
        if (!releaseId) {
          const rt = getCell(row, "release_title", "release", "album");
          if (rt) {
            releaseId = titleToReleaseId.get(rt.trim().toLowerCase()) ?? null;
            if (!releaseId) errors.push(`Row ${rowNum}: no release titled "${rt}", leaving unlinked.`);
          }
        }
        const { error: insErr } = await supabase.from("catalog_songs").insert({ user_id: user.id, title, release_id: releaseId });
        if (insErr) { skipped++; errors.push(`Row ${rowNum}: ${insErr.message}`); continue; }
        created++;
      }
      await loadCatalog();
      const parts = [`Imported ${created} song(s).`];
      if (skipped) parts.push(`${skipped} row(s) skipped.`);
      parts.push("Audio versions must be uploaded on each song's edit page.");
      if (errors.length) parts.push(errors.slice(0, 4).join(" "));
      setIoMessage({ kind: errors.length && created === 0 ? "error" : "success", text: parts.join(" ") });
    } catch (e) {
      setIoMessage({ kind: "error", text: e instanceof Error ? e.message : "Import failed." });
    } finally { setImporting(false); }
  };

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
          {/* ── Header ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: S.surface,
              borderBottom: `1px solid ${S.border}`,
              flexShrink: 0,
              gap: 10,
              flexWrap: "wrap",
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
              Library
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <CsvBtn
                icon={<Download size={10} />}
                label={exporting ? "…" : "CSV"}
                onClick={() => void handleExport()}
                disabled={exporting}
              />
              <CsvFileBtn
                label={importing ? "…" : "Import"}
                onFile={handleImport}
                disabled={importing}
              />
              <StudioMicroappPrimaryButton
                label="New song"
                onClick={() => setNewSongModalOpen(true)}
              />
            </div>
          </div>

          {/* ── Content ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            <IoBanner msg={ioMessage} />

            {loading ? (
              <StudioMicroappSkeletonListRowsEmbedded rows={7} />
            ) : songs.length === 0 ? (
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
                  <ListMusic size={22} color={S.textFaint} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 500, color: S.textMuted }}>
                  No songs yet
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: S.textFaint,
                    maxWidth: 240,
                    lineHeight: 1.6,
                  }}
                >
                  Track demos, alternates, and references. Link to a release
                  when ready.
                </p>
                <div style={{ marginTop: 4 }}>
                  <StudioMicroappPrimaryButton
                    label="New song"
                    onClick={() => setNewSongModalOpen(true)}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {songs.map((s) => (
                  <SongCard
                    key={s.id}
                    song={s}
                    versions={versionsBySong[s.id] || []}
                    versionBusyId={versionBusyId}
                    activeStoragePath={activeTrack?.storagePath ?? null}
                    libraryAudioPlaying={libraryAudioPlaying}
                    onToggleLibraryAudio={toggleLibraryAudio}
                    onPlay={(storagePath, title, label) =>
                      void playCatalogVersion(storagePath, title, label)
                    }
                    onAskFeedback={(versionId, songTitle, versionLabel) =>
                      setShareVersion({ versionId, songTitle, versionLabel })
                    }
                    onRequestDownloadVersion={(v) =>
                      setVersionDownloadTarget({ song: s, v })
                    }
                    onDeleteVersion={(v) => setVersionDeleteTarget({ song: s, v })}
                    onEdit={() => goToDetail(s.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {shareVersion && (
            <FeedbackShareModal
              open
              onClose={() => setShareVersion(null)}
              catalogSongVersionId={shareVersion.versionId}
              songTitle={shareVersion.songTitle}
              versionLabel={shareVersion.versionLabel}
            />
          )}
        </>
      ) : (
        <StudioCatalogEditPanel
          songId={current.songId}
          onMissingSong={onMissingSong}
          onDeleted={() => {
            goBack();
            void loadCatalog();
          }}
          onLoadedMeta={onSongMeta}
        />
      )}

      {showBottomLibraryPlayer && (
        <MicroappAudioPlayerBar
          {...studioMicroappAudioBarSharedEmbedProps}
          embeddedPlacement="bottom"
          track={activeTrack}
          loading={playerLoading}
          error={playerError}
          onClear={clearCatalogPlayer}
          libraryAutoplayGate={shouldAutoplayStudioLibraryEmbed}
          libraryAudioListSync={libraryAudioListSync}
          ariaLabel="Library audio player"
        />
      )}

      <CatalogVersionDownloadModal
        open={versionDownloadTarget !== null}
        onClose={() => {
          if (!downloadModalBusy) setVersionDownloadTarget(null);
        }}
        onConfirm={confirmDownloadVersion}
        songTitle={versionDownloadTarget?.song.title ?? ""}
        versionLabel={
          versionDownloadTarget
            ? catalogVersionRowLabel(versionDownloadTarget.v)
            : ""
        }
        busy={downloadModalBusy}
      />

      <CatalogVersionDeleteModal
        open={versionDeleteTarget !== null}
        onClose={() => {
          if (!versionBusyId) setVersionDeleteTarget(null);
        }}
        onConfirm={confirmDeleteVersion}
        songTitle={versionDeleteTarget?.song.title ?? ""}
        versionLabel={
          versionDeleteTarget
            ? versionDeleteTarget.v.label || versionDeleteTarget.v.file_name
            : ""
        }
        busy={versionBusyId !== null}
      />

      <StudioNewCatalogSongModal
        open={newSongModalOpen}
        onClose={() => setNewSongModalOpen(false)}
        onCreated={handleNewSongCreated}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function CsvBtn({ icon, label, onClick, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outlineSoft"
      size="micro"
      onClick={onClick}
      disabled={disabled}
      className="gap-1.5 !border-[#d4b896] !text-[11px] !font-medium text-[#5a3518] disabled:!text-[#b89070]"
    >
      {icon} {label}
    </Button>
  );
}

function CsvFileBtn({ label, onFile, disabled }: {
  label: string; onFile: (f: File) => void; disabled: boolean;
}) {
  const inputRef = { current: null as HTMLInputElement | null };
  return (
    <>
      <Button
        type="button"
        variant="outlineSoft"
        size="micro"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="gap-1.5 !border-[#d4b896] !text-[11px] !font-medium text-[#5a3518] disabled:!text-[#b89070]"
      >
        <Upload size={10} /> {label}
      </Button>
      <input
        ref={(el) => { inputRef.current = el; }}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

function SongCard({
  song,
  versions,
  versionBusyId,
  activeStoragePath,
  libraryAudioPlaying,
  onToggleLibraryAudio,
  onPlay,
  onAskFeedback,
  onRequestDownloadVersion,
  onDeleteVersion,
  onEdit,
}: {
  song: SongRow;
  versions: CatalogSongVersion[];
  versionBusyId: string | null;
  activeStoragePath: string | null;
  libraryAudioPlaying: boolean;
  onToggleLibraryAudio: () => void;
  onPlay: (storagePath: string, title: string, label: string) => void;
  onAskFeedback: (versionId: string, songTitle: string, versionLabel: string) => void;
  onRequestDownloadVersion: (v: CatalogSongVersion) => void;
  onDeleteVersion: (v: CatalogSongVersion) => void;
  onEdit: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 4,
        border: `1px solid ${hovered ? S.borderAccent : S.border}`,
        background: hovered ? S.hover : S.surface,
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Song header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: versions.length ? 10 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.35, color: S.textPrimary, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {song.title}
          </span>
          {song.releaseTitle && (
            <div
              style={{
                marginTop: 6,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                columnGap: 8,
                rowGap: 6,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: S.textMuted,
                  flexShrink: 0,
                }}
              >
                Linked Release:
              </span>
              {song.release_id ? (
                <Link
                  href={`/home?releaseId=${encodeURIComponent(song.release_id)}`}
                  scroll={false}
                  className={cn(
                    "inline-flex w-fit max-w-[min(100%,18rem)] min-w-0 shrink items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium leading-none no-underline transition-opacity hover:opacity-90"
                  )}
                  style={{
                    borderColor: S.border,
                    background: "rgba(255, 253, 248, 0.92)",
                    color: S.textSecondary,
                  }}
                  title={song.releaseTitle}
                >
                  <Disc3
                    className="h-3.5 w-3.5 shrink-0 opacity-80"
                    style={{ color: S.textMuted }}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">{song.releaseTitle}</span>
                </Link>
              ) : (
                <div
                  className={cn(
                    "inline-flex w-fit max-w-[min(100%,18rem)] min-w-0 shrink items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium leading-none"
                  )}
                  style={{
                    borderColor: S.border,
                    background: "rgba(255, 253, 248, 0.92)",
                    color: S.textSecondary,
                  }}
                  title={song.releaseTitle}
                >
                  <Disc3
                    className="h-3.5 w-3.5 shrink-0 opacity-80"
                    style={{ color: S.textMuted }}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">{song.releaseTitle}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="!text-[#5a3518] hover:!text-[#1e1008] hover:!no-underline"
        >
          Edit
        </Button>
      </div>

      {/* Versions */}
      {versions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {versions.map((v) => {
            const rowLabel = catalogVersionRowLabel(v);
            const hasCustomLabel = Boolean(v.label?.trim());
            const rowBusy = versionBusyId === v.id;
            const isActiveRow = activeStoragePath === v.storage_path;
            const showPause = isActiveRow && libraryAudioPlaying;
            return (
              <div
                key={v.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  type="button"
                  variant="outlineSoft"
                  size="micro"
                  disabled={rowBusy}
                  onClick={() =>
                    isActiveRow
                      ? onToggleLibraryAudio()
                      : onPlay(v.storage_path, song.title, rowLabel)
                  }
                  className={`!min-h-11 md:!min-h-8 flex-1 min-w-0 justify-start !gap-2 !px-3 !py-2 md:!px-2.5 md:!py-1 !text-sm leading-snug opacity-100 disabled:opacity-55 ${
                    isActiveRow
                      ? "!border-[#924d0e] !text-white hover:!border-[#7a420c] hover:!bg-[#924d0e]"
                      : ""
                  }`}
                  style={
                    isActiveRow
                      ? {
                          background: S.accent,
                          borderRadius: 8,
                          color: S.accentText,
                        }
                      : undefined
                  }
                >
                  {showPause ? (
                    <Pause
                      size={18}
                      className={`shrink-0 ${isActiveRow ? "text-white" : "text-[#b89070]"}`}
                      fill="currentColor"
                      stroke="none"
                      strokeWidth={0}
                    />
                  ) : (
                    <Play
                      size={18}
                      className={`shrink-0 pl-0.5 ${isActiveRow ? "text-white" : "text-[#b89070]"}`}
                      fill="currentColor"
                      stroke="none"
                      strokeWidth={0}
                    />
                  )}
                  <span
                    className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap ${isActiveRow ? "font-semibold text-white" : ""}`}
                  >
                    {isActiveRow || hasCustomLabel ? (
                      rowLabel
                    ) : (
                      <span className="text-[#b89070]">{rowLabel}</span>
                    )}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outlineBlue"
                  size="micro"
                  disabled={rowBusy}
                  onClick={() => onAskFeedback(v.id, song.title, rowLabel)}
                  className="!min-h-11 md:!min-h-8 shrink-0 !gap-2 !px-3 !py-2 md:!px-2.5 md:!py-1 !text-sm leading-snug opacity-100 disabled:opacity-55"
                >
                  <LinkIcon size={16} strokeWidth={2.25} className="shrink-0" />
                  Share
                </Button>
                <Button
                  type="button"
                  variant="outlineWarm"
                  size="micro"
                  disabled={rowBusy}
                  onClick={() => onRequestDownloadVersion(v)}
                  className="!min-h-11 md:!min-h-8 shrink-0 !gap-2 !px-3 !py-2 md:!px-2.5 md:!py-1 !text-sm leading-snug opacity-100 disabled:opacity-55"
                >
                  <Download size={16} strokeWidth={2.25} className="shrink-0" />
                  Download
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="micro"
                  disabled={rowBusy}
                  onClick={() => onDeleteVersion(v)}
                  className="!min-h-11 md:!min-h-8 shrink-0 !gap-2 !px-3 !py-2 md:!px-2.5 md:!py-1 !text-sm leading-snug border-[#a82820] text-[#a82820] hover:bg-[rgba(168,40,32,0.10)] opacity-100 disabled:opacity-55"
                >
                  <Trash2 size={16} strokeWidth={2.25} className="shrink-0" />
                  Delete
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
