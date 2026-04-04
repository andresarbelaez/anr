"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { GENRES } from "@/lib/utils/metadata-validation";
import type { MetadataErrors } from "@/lib/utils/metadata-validation";

export interface ReleaseMetadata {
  title: string;
  type: "single" | "ep" | "album";
  genre: string;
  releaseDate: string;
  description: string;
}

interface MetadataFormProps {
  data: ReleaseMetadata;
  errors: MetadataErrors;
  onChange: (data: ReleaseMetadata) => void;
}

export function MetadataForm({ data, errors, onChange }: MetadataFormProps) {
  const update = (field: keyof ReleaseMetadata, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5">
      <Input
        id="title"
        label="Release Title"
        value={data.title}
        onChange={(e) => update("title", e.target.value)}
        placeholder="My Amazing Song"
        error={errors.title}
      />

      <Select
        id="type"
        label="Release Type"
        value={data.type}
        onChange={(e) =>
          update("type", e.target.value as ReleaseMetadata["type"])
        }
        options={[
          { value: "single", label: "Single" },
          { value: "ep", label: "EP" },
          { value: "album", label: "Album" },
        ]}
      />

      <Select
        id="genre"
        label="Genre"
        value={data.genre}
        onChange={(e) => update("genre", e.target.value)}
        placeholder="Select a genre"
        options={GENRES.map((g) => ({ value: g, label: g }))}
        error={errors.genre}
      />

      <Input
        id="releaseDate"
        label="Release Date"
        type="date"
        value={data.releaseDate}
        onChange={(e) => update("releaseDate", e.target.value)}
        error={errors.releaseDate}
      />

      <div className="space-y-1.5">
        <label
          htmlFor="description"
          className="block text-sm font-medium text-neutral-300"
        >
          Description (optional)
        </label>
        <textarea
          id="description"
          value={data.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Tell us about this release..."
          rows={3}
          className="flex w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
        />
      </div>
    </div>
  );
}
