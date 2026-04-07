"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Plus, ListMusic, Download, Upload, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CatalogSong, CatalogSongVersion, Release } from "@/lib/supabase/types";
import { S } from "@/components/studio/ui/s";
import { useStudioWindowChrome } from "@/components/studio/studio-window-chrome";
import { StudioCatalogEditPanel } from "@/components/studio/windows/StudioCatalogEditPanel";
import { MicroappAudioPlayerBar } from "@/components/audio/MicroappAudioPlayerBar";
import { useCatalogPlayer } from "@/contexts/catalog-player-context";
import { FeedbackShareModal } from "@/components/feedback/FeedbackShareModal";
import {
  downloadCsv,
  getCell,
  isUuid,
  parseCsvRecords,
} from "@/lib/utils/csv-io";
import { CATALOG_MP3_BUCKET } from "@/lib/utils/catalog-mp3";
import { CatalogVersionDeleteModal } from "@/components/catalog/CatalogVersionDeleteModal";
import { StudioNewCatalogSongModal } from "@/components/studio/StudioNewCatalogSongModal";

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

// ── Spinner ───────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
      <div
        className="animate-spin"
        style={{
          width: 22, height: 22,
          border: `2px solid ${S.border}`,
          borderTopColor: S.accent,
          borderRadius: "50%",
        }}
      />
    </div>
  );
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

  const [songs, setSongs] = useState<SongRow[]>([]);
  const [versionsBySong, setVersionsBySong] = useState<Record<string, CatalogSongVersion[]>>({});
  const [loading, setLoading] = useState(true);
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
  } = useCatalogPlayer();

  const loadCatalog = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSongs([]); setVersionsBySong({}); return; }

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
  }, []);

  const handleNewSongCreated = useCallback(
    async (songId: string) => {
      await loadCatalog();
      goToDetail(songId);
    },
    [loadCatalog, goToDetail]
  );

  const handleDownloadVersion = useCallback(async (v: CatalogSongVersion) => {
    setIoMessage(null);
    const supabase = createClient();
    const { data, error: uErr } = await supabase.storage
      .from(CATALOG_MP3_BUCKET)
      .createSignedUrl(v.storage_path, 3600);

    if (uErr || !data?.signedUrl) {
      setIoMessage({
        kind: "error",
        text: uErr?.message ?? "Could not create download link.",
      });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }, []);

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
      setLoading(true);
      await loadCatalog();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadCatalog]);

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
      downloadCsv(`anr-catalog-export-${new Date().toISOString().slice(0, 10)}.csv`, exportRows);
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
      parts.push("MP3 versions must be uploaded on each song's edit page.");
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
              <button
                type="button"
                onClick={() => setNewSongModalOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 500,
                  color: S.accentText,
                  background: S.accent,
                  border: `1px solid ${S.accent}`,
                  borderRadius: 2,
                  padding: "5px 9px",
                  cursor: "pointer",
                }}
              >
                <Plus size={10} strokeWidth={3} />
                New
              </button>
            </div>
          </div>

          {/* ── Content ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            <IoBanner msg={ioMessage} />

            {loading ? (
              <Spinner />
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
                <button
                  type="button"
                  onClick={() => setNewSongModalOpen(true)}
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: S.accentText,
                    background: S.accent,
                    border: `1px solid ${S.accent}`,
                    borderRadius: 2,
                    padding: "6px 12px",
                    cursor: "pointer",
                    marginTop: 4,
                  }}
                >
                  Add a song
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {songs.map((s) => (
                  <SongCard
                    key={s.id}
                    song={s}
                    versions={versionsBySong[s.id] || []}
                    versionBusyId={versionBusyId}
                    onPlay={(storagePath, title, label) =>
                      void playCatalogVersion(storagePath, title, label)
                    }
                    onAskFeedback={(versionId, songTitle, versionLabel) =>
                      setShareVersion({ versionId, songTitle, versionLabel })
                    }
                    onDownloadVersion={(v) => void handleDownloadVersion(v)}
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

      <MicroappAudioPlayerBar
        variant="embedded"
        track={activeTrack}
        loading={playerLoading}
        error={playerError}
        onClear={clearCatalogPlayer}
        autoPlayOnNewSource={false}
        libraryAutoplayGate={shouldAutoplayStudioLibraryEmbed}
        ariaLabel="Library audio player"
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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 11, fontWeight: 500,
        color: disabled ? S.textFaint : S.textSecondary,
        background: "transparent", border: `1px solid ${S.border}`,
        borderRadius: 2, padding: "5px 8px", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {icon} {label}
    </button>
  );
}

function CsvFileBtn({ label, onFile, disabled }: {
  label: string; onFile: (f: File) => void; disabled: boolean;
}) {
  const inputRef = { current: null as HTMLInputElement | null };
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 11, fontWeight: 500,
          color: disabled ? S.textFaint : S.textSecondary,
          background: "transparent", border: `1px solid ${S.border}`,
          borderRadius: 2, padding: "5px 8px", cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Upload size={10} /> {label}
      </button>
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
  onPlay,
  onAskFeedback,
  onDownloadVersion,
  onDeleteVersion,
  onEdit,
}: {
  song: SongRow;
  versions: CatalogSongVersion[];
  versionBusyId: string | null;
  onPlay: (storagePath: string, title: string, label: string) => void;
  onAskFeedback: (versionId: string, songTitle: string, versionLabel: string) => void;
  onDownloadVersion: (v: CatalogSongVersion) => void;
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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: versions.length ? 8 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: S.textPrimary, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {song.title}
          </span>
          {song.releaseTitle && (
            <span style={{ fontSize: 10, color: S.textFaint, marginTop: 2, display: "block" }}>
              {song.releaseTitle}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          style={{
            fontSize: 11,
            color: S.textSecondary,
            textDecoration: "none",
            flexShrink: 0,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Edit
        </button>
      </div>

      {/* Versions */}
      {versions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {versions.map((v) => {
            const label = v.label || v.file_name;
            const rowBusy = versionBusyId === v.id;
            return (
              <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => onPlay(v.storage_path, song.title, label)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "transparent", border: `1px solid ${S.borderFaint}`,
                    borderRadius: 2, padding: "3px 7px", cursor: rowBusy ? "not-allowed" : "pointer",
                    color: S.textMuted, fontSize: 11, flex: "1 1 auto", minWidth: 0, textAlign: "left",
                    opacity: rowBusy ? 0.55 : 1,
                  }}
                  onMouseEnter={(e) => { if (rowBusy) return; (e.currentTarget as HTMLButtonElement).style.borderColor = S.border; (e.currentTarget as HTMLButtonElement).style.color = S.textSecondary; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = S.borderFaint; (e.currentTarget as HTMLButtonElement).style.color = S.textMuted; }}
                >
                  <Play size={10} color={S.textFaint} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {v.label ? v.label : <span style={{ color: S.textFaint }}>{v.file_name}</span>}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => onAskFeedback(v.id, song.title, label)}
                  style={{
                    fontSize: 10,
                    color: "#2563eb",
                    background: "transparent",
                    border: "1px solid rgba(37,99,235,0.38)",
                    borderRadius: 2,
                    padding: "3px 6px",
                    cursor: rowBusy ? "not-allowed" : "pointer",
                    flexShrink: 0,
                    opacity: rowBusy ? 0.55 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (rowBusy) return;
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(37,99,235,0.10)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  Share
                </button>
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => onDownloadVersion(v)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10,
                    color: S.textSecondary,
                    background: "transparent",
                    border: "1px solid rgba(90,53,24,0.38)",
                    borderRadius: 2,
                    padding: "3px 6px",
                    cursor: rowBusy ? "not-allowed" : "pointer",
                    flexShrink: 0,
                    opacity: rowBusy ? 0.55 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (rowBusy) return;
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.borderColor = "rgba(90,53,24,0.55)";
                    b.style.background = "rgba(90,53,24,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.borderColor = "rgba(90,53,24,0.38)";
                    b.style.background = "transparent";
                  }}
                >
                  <Download size={10} color={S.textSecondary} />
                  Download
                </button>
                <button
                  type="button"
                  disabled={rowBusy}
                  onClick={() => onDeleteVersion(v)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10,
                    color: S.error,
                    background: "transparent",
                    border: `1px solid ${S.error}`,
                    borderRadius: 2,
                    padding: "3px 6px",
                    cursor: rowBusy ? "not-allowed" : "pointer",
                    flexShrink: 0,
                    opacity: rowBusy ? 0.55 : 1,
                  }}
                  onMouseEnter={(e) => { if (rowBusy) return; (e.currentTarget as HTMLButtonElement).style.background = S.errorBg; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <Trash2 size={10} />
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
