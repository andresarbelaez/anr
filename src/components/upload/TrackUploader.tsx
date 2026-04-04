"use client";

import { useCallback, useState } from "react";
import { Upload, X, Music, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import {
  validateAudioFile,
  parseWavHeader,
  ACCEPTED_EXTENSIONS,
  MAX_WAV_SIZE,
  estimateWavSize,
  type AudioValidationResult,
} from "@/lib/utils/audio-validation";

export interface TrackData {
  file: File;
  title: string;
  trackNumber: number;
  explicit: boolean;
  durationSeconds: number | null;
  validation: AudioValidationResult;
  isLossless: boolean;
  converting: boolean;
  convertedFile?: File;
}

interface TrackUploaderProps {
  tracks: TrackData[];
  onChange: (tracks: TrackData[]) => void;
}

export function TrackUploader({ tracks, onChange }: TrackUploaderProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const newTracks: TrackData[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = validateAudioFile(file);
        const isWav = file.name.toLowerCase().endsWith(".wav");

        let finalValidation = validation;
        let durationSeconds: number | null = null;
        let convertedFile: File | undefined;

        if (validation.valid && isWav) {
          finalValidation = await parseWavHeader(file);
          if (file.size > MAX_WAV_SIZE) {
            finalValidation = {
              ...finalValidation,
              valid: false,
              errors: [
                ...finalValidation.errors,
                `File is ${(file.size / 1024 / 1024).toFixed(1)}MB, which exceeds the 50MB storage limit. Try a shorter track.`,
              ],
            };
          }
          durationSeconds = finalValidation.metadata?.durationSeconds ?? null;
          convertedFile = file;
        } else if (validation.valid && !isWav) {
          const formData = new FormData();
          formData.append("file", file);
          try {
            const res = await fetch("/api/convert", {
              method: "POST",
              body: formData,
            });
            if (res.ok) {
              const wavBlob = await res.blob();
              convertedFile = new File(
                [wavBlob],
                file.name.replace(/\.[^.]+$/, ".wav"),
                { type: "audio/wav" }
              );
              durationSeconds =
                parseInt(res.headers.get("X-Duration-Seconds") || "0", 10) ||
                null;
            } else {
              const errorData = await res
                .json()
                .catch(() => ({ error: "Failed to convert file" }));
              finalValidation = {
                ...validation,
                valid: false,
                errors: [
                  ...validation.errors,
                  errorData.error || "Failed to convert file to WAV",
                ],
              };
            }
          } catch {
            finalValidation = {
              ...validation,
              valid: false,
              errors: [...validation.errors, "Failed to convert file to WAV"],
            };
          }
        }

        newTracks.push({
          file,
          title: file.name.replace(/\.(wav|mp3|flac|aac|m4a|ogg)$/i, ""),
          trackNumber: tracks.length + i + 1,
          explicit: false,
          durationSeconds,
          validation: finalValidation,
          isLossless: validation.isLossless,
          converting: false,
          convertedFile,
        });
      }

      onChange([...tracks, ...newTracks]);
    },
    [tracks, onChange]
  );

  const removeTrack = (index: number) => {
    const updated = tracks.filter((_, i) => i !== index);
    updated.forEach((t, i) => (t.trackNumber = i + 1));
    onChange(updated);
  };

  const updateTrack = (index: number, updates: Partial<TrackData>) => {
    const updated = tracks.map((t, i) =>
      i === index ? { ...t, ...updates } : t
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition",
          dragOver
            ? "border-white bg-white/5"
            : "border-neutral-700 hover:border-neutral-500"
        )}
      >
        <Upload className="mb-3 h-8 w-8 text-neutral-500" />
        <p className="text-sm text-neutral-300">
          Drag & drop audio files here, or{" "}
          <label className="cursor-pointer font-medium text-white underline underline-offset-2 hover:text-neutral-200">
            browse
            <input
              type="file"
              accept=".wav,.mp3,.flac,.aac,.m4a,.ogg"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFiles(e.target.files);
                }
              }}
            />
          </label>
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          WAV, MP3, FLAC, AAC, or OGG — non-WAV files are auto-converted to stereo
          44.1kHz WAV (~{(estimateWavSize(60) / 1024 / 1024).toFixed(1)}MB/min); uploads must
          stay under 50MB as WAV.
        </p>
      </div>

      {tracks.length > 0 && (
        <div className="space-y-3">
          {tracks.map((track, index) => (
            <div
              key={index}
              className={cn(
                "rounded-lg border p-4",
                track.validation.valid
                  ? "border-neutral-800 bg-neutral-900/50"
                  : "border-red-900 bg-red-950/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-sm font-medium text-neutral-400">
                  {track.trackNumber}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    {track.converting ? (
                      <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-neutral-600 border-t-white" />
                    ) : track.validation.valid ? (
                      <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                    )}
                    <span className="truncate text-xs text-neutral-500">
                      {track.file.name} &middot;{" "}
                      {(track.file.size / 1024 / 1024).toFixed(1)}MB
                      {track.durationSeconds !== null && (
                        <>
                          {" "}
                          &middot; {Math.floor(track.durationSeconds / 60)}:
                          {String(track.durationSeconds % 60).padStart(2, "0")}
                        </>
                      )}
                    </span>
                    {!track.isLossless && track.validation.valid && (
                      <span className="inline-flex items-center rounded bg-yellow-900/40 px-1.5 py-0.5 text-xs text-yellow-300">
                        Converted from{" "}
                        {track.file.name.split(".").pop()?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <Input
                    value={track.title}
                    onChange={(e) =>
                      updateTrack(index, { title: e.target.value })
                    }
                    placeholder="Track title"
                  />

                  <label className="flex items-center gap-2 text-sm text-neutral-400">
                    <input
                      type="checkbox"
                      checked={track.explicit}
                      onChange={(e) =>
                        updateTrack(index, { explicit: e.target.checked })
                      }
                      className="rounded border-neutral-700 bg-neutral-900"
                    />
                    Explicit content
                  </label>

                  {!track.validation.valid && (
                    <div className="space-y-1">
                      {track.validation.errors.map((err, i) => (
                        <p key={i} className="text-sm text-red-400">
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTrack(index)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
