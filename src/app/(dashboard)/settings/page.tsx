"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/lib/supabase/types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("profiles")
        .update({
          artist_name: profile.artist_name,
          bio: profile.bio,
          website: profile.website,
          instagram: profile.instagram,
          twitter: profile.twitter,
          spotify_url: profile.spotify_url,
          apple_music_url: profile.apple_music_url,
        })
        .eq("id", user.id);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }

    setSaving(false);
  };

  const update = (field: keyof Profile, value: string) => {
    setProfile((p) => ({ ...p, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Settings</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Manage your artist profile
      </p>

      <form onSubmit={handleSave} className="mt-8 max-w-lg space-y-5">
        <Input
          id="artistName"
          label="Artist Name"
          value={profile.artist_name || ""}
          onChange={(e) => update("artist_name", e.target.value)}
          required
        />

        <div className="space-y-1.5">
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-neutral-300"
          >
            Bio
          </label>
          <textarea
            id="bio"
            value={profile.bio || ""}
            onChange={(e) => update("bio", e.target.value)}
            placeholder="Tell listeners about yourself..."
            rows={4}
            className="flex w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
          />
        </div>

        {profile.slug && (
          <div>
            <p className="text-sm text-neutral-500">
              Your public profile:{" "}
              <span className="text-neutral-300">
                {typeof window !== "undefined" ? window.location.origin : ""}/
                {profile.slug}
              </span>
            </p>
          </div>
        )}

        <hr className="border-neutral-800" />

        <h2 className="text-sm font-medium uppercase tracking-wider text-neutral-500">
          Social Links
        </h2>

        <Input
          id="website"
          label="Website"
          type="url"
          value={profile.website || ""}
          onChange={(e) => update("website", e.target.value)}
          placeholder="https://yoursite.com"
        />

        <Input
          id="instagram"
          label="Instagram username"
          value={profile.instagram || ""}
          onChange={(e) => update("instagram", e.target.value)}
          placeholder="yourhandle"
        />

        <Input
          id="twitter"
          label="Twitter/X username"
          value={profile.twitter || ""}
          onChange={(e) => update("twitter", e.target.value)}
          placeholder="yourhandle"
        />

        <Input
          id="spotify"
          label="Spotify Artist URL"
          type="url"
          value={profile.spotify_url || ""}
          onChange={(e) => update("spotify_url", e.target.value)}
          placeholder="https://open.spotify.com/artist/..."
        />

        <Input
          id="appleMusic"
          label="Apple Music Artist URL"
          type="url"
          value={profile.apple_music_url || ""}
          onChange={(e) => update("apple_music_url", e.target.value)}
          placeholder="https://music.apple.com/artist/..."
        />

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
          {saved && (
            <span className="text-sm text-green-400">Saved!</span>
          )}
        </div>
      </form>
    </div>
  );
}
