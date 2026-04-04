"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  MetadataForm,
  type ReleaseMetadata,
} from "@/components/upload/MetadataForm";
import { TrackUploader, type TrackData } from "@/components/upload/TrackUploader";
import { CoverArtUploader } from "@/components/upload/CoverArtUploader";
import { ReviewStep } from "@/components/upload/ReviewStep";
import {
  validateReleaseMetadata,
  type MetadataErrors,
} from "@/lib/utils/metadata-validation";

const STEPS = ["Release Info", "Tracks", "Cover Art", "Review"] as const;

export default function NewReleasePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [artistName, setArtistName] = useState("");
  const [errors, setErrors] = useState<MetadataErrors>({});

  const [metadata, setMetadata] = useState<ReleaseMetadata>({
    title: "",
    type: "single",
    genre: "",
    releaseDate: "",
    description: "",
  });

  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("artist_name")
          .eq("id", user.id)
          .single();
        if (profile) setArtistName((profile as { artist_name: string }).artist_name);
      }
    }
    loadProfile();
  }, []);

  const canNext = (): boolean => {
    switch (step) {
      case 0: {
        const errs = validateReleaseMetadata({
          title: metadata.title,
          artistName,
          releaseDate: metadata.releaseDate,
          genre: metadata.genre,
        });
        return Object.keys(errs).length === 0;
      }
      case 1:
        return tracks.length > 0 && tracks.every((t) => t.validation.valid && !t.converting);
      case 2:
        return true; // cover art is recommended but not blocking
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 0) {
      const errs = validateReleaseMetadata({
        title: metadata.title,
        artistName,
        releaseDate: metadata.releaseDate,
        genre: metadata.genre,
      });
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload cover art if present
      let coverArtUrl: string | null = null;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("artwork")
          .upload(path, coverFile);
        if (!uploadErr) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("artwork").getPublicUrl(path);
          coverArtUrl = publicUrl;
        }
      }

      const { data: releaseData, error: releaseErr } = await supabase
        .from("releases")
        .insert({
          user_id: user.id,
          title: metadata.title,
          type: metadata.type,
          genre: metadata.genre,
          release_date: metadata.releaseDate || null,
          description: metadata.description || null,
          cover_art_url: coverArtUrl,
          status: "draft",
        })
        .select()
        .single();

      if (releaseErr || !releaseData) throw releaseErr || new Error("Failed to create release");
      const release = releaseData as { id: string };

      for (const track of tracks) {
        const trackPath = `${user.id}/${release.id}/${track.trackNumber}.wav`;
        await supabase.storage.from("tracks").upload(trackPath, track.convertedFile || track.file);

        const {
          data: { publicUrl: wavUrl },
        } = supabase.storage.from("tracks").getPublicUrl(trackPath);

        await supabase.from("tracks").insert({
          release_id: release.id,
          title: track.title,
          track_number: track.trackNumber,
          wav_url: wavUrl,
          duration_seconds: track.durationSeconds,
          explicit: track.explicit,
        });
      }

      // Submit for distribution via API route
      await fetch("/api/distribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId: release.id }),
      });

      router.push(`/releases/${release.id}`);
    } catch (err) {
      console.error("Submission error:", err);
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">New Release</h1>

        {/* Step indicator */}
        <div className="mt-6 flex gap-2">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className="flex items-center gap-2"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition ${
                  i <= step
                    ? "bg-white text-black"
                    : "bg-neutral-800 text-neutral-500"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm ${
                  i <= step ? "text-white" : "text-neutral-500"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="mx-2 h-px w-8 bg-neutral-800" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl">
        {step === 0 && (
          <MetadataForm
            data={metadata}
            errors={errors}
            onChange={setMetadata}
          />
        )}
        {step === 1 && <TrackUploader tracks={tracks} onChange={setTracks} />}
        {step === 2 && (
          <CoverArtUploader
            file={coverFile}
            preview={coverPreview}
            onChange={(f, p) => {
              setCoverFile(f);
              setCoverPreview(p);
            }}
          />
        )}
        {step === 3 && (
          <ReviewStep
            metadata={metadata}
            tracks={tracks}
            coverPreview={coverPreview}
            artistName={artistName}
          />
        )}

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canNext()}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting}>
              <Send className="mr-2 h-4 w-4" />
              Submit for distribution
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
