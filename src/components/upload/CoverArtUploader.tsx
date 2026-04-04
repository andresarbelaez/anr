"use client";

import { useState, useCallback } from "react";
import { ImagePlus, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateCoverArt } from "@/lib/utils/metadata-validation";
import { cn } from "@/lib/utils/cn";

interface CoverArtUploaderProps {
  file: File | null;
  preview: string | null;
  onChange: (file: File | null, preview: string | null) => void;
  error?: string | null;
}

export function CoverArtUploader({
  file,
  preview,
  onChange,
  error: externalError,
}: CoverArtUploaderProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (f: File) => {
      const err = await validateCoverArt(f);
      setValidationError(err);
      setWarning(null);
      if (!err) {
        const url = URL.createObjectURL(f);
        // Check dimensions for recommendation
        const img = new window.Image();
        img.onload = () => {
          if (img.width < 3000 || img.height < 3000) {
            setWarning(
              `Image is ${img.width}x${img.height}px. For best quality on all platforms, 3000x3000px is recommended.`
            );
          }
          URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(f);
        onChange(f, url);
      }
    },
    [onChange]
  );

  const error = externalError || validationError;

  if (preview && file) {
    return (
      <div className="space-y-2">
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Cover art preview"
            className="h-48 w-48 rounded-xl object-cover"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              URL.revokeObjectURL(preview);
              onChange(null, null);
              setValidationError(null);
              setWarning(null);
            }}
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-neutral-800 p-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-neutral-500">
          {file.name} &middot; {(file.size / 1024 / 1024).toFixed(1)}MB
        </p>
        {warning && (
          <div className="flex items-center gap-1.5 text-sm text-yellow-400">
            <AlertCircle className="h-4 w-4" />
            {warning}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
        className={cn(
          "flex h-48 w-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition",
          dragOver
            ? "border-white bg-white/5"
            : "border-neutral-700 hover:border-neutral-500"
        )}
      >
        <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center">
          <ImagePlus className="mb-2 h-8 w-8 text-neutral-500" />
          <span className="text-xs text-neutral-400">Upload cover art</span>
          <span className="mt-0.5 text-xs text-neutral-600">1400x1400 min</span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
        </label>
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {warning && !error && (
        <div className="flex items-center gap-1.5 text-sm text-yellow-400">
          <AlertCircle className="h-4 w-4" />
          {warning}
        </div>
      )}
    </div>
  );
}
