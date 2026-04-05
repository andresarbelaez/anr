"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Release } from "@/lib/supabase/types";

export default function CatalogNewPage() {
  const router = useRouter();
  const [releases, setReleases] = useState<Release[]>([]);
  const [title, setTitle] = useState("");
  const [releaseId, setReleaseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("releases")
        .select("*")
        .order("created_at", { ascending: false });
      setReleases((data as Release[]) || []);
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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

    router.push(`/catalog/${data.id}`);
    router.refresh();
  };

  return (
    <div>
      <Link
        href="/catalog"
        className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to catalog
      </Link>

      <h1 className="text-2xl font-bold text-white">New catalog song</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Add MP3 versions on the next screen after you create the song.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-4">
        {error && (
          <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Select
          label="Related release (optional)"
          value={releaseId}
          onChange={(e) => setReleaseId(e.target.value)}
          placeholder="None"
          options={releases.map((r) => ({
            value: r.id,
            label: `${r.title} (${r.status})`,
          }))}
        />
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving}>
            Create song
          </Button>
          <Link href="/catalog">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
