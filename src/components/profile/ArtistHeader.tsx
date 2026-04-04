import { Globe, Music } from "lucide-react";
import type { Profile } from "@/lib/supabase/types";

function SocialLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-neutral-400 transition hover:text-white"
    >
      {label}
    </a>
  );
}

export function ArtistHeader({ profile }: { profile: Profile }) {
  return (
    <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-6">
      <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-full bg-neutral-800">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.artist_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music className="h-12 w-12 text-neutral-600" />
          </div>
        )}
      </div>

      <div className="mt-4 sm:mt-0">
        <h1 className="text-3xl font-bold text-white">
          {profile.artist_name}
        </h1>
        {profile.bio && (
          <p className="mt-2 max-w-lg text-neutral-400">{profile.bio}</p>
        )}

        <div className="mt-3 flex items-center justify-center gap-4 sm:justify-start">
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-neutral-400 transition hover:text-white"
            >
              <Globe className="h-4 w-4" />
            </a>
          )}
          {profile.instagram && (
            <SocialLink
              href={`https://instagram.com/${profile.instagram}`}
              label="Instagram"
            />
          )}
          {profile.twitter && (
            <SocialLink
              href={`https://twitter.com/${profile.twitter}`}
              label="X/Twitter"
            />
          )}
          {profile.spotify_url && (
            <a
              href={profile.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-400 transition hover:text-white"
            >
              Spotify
            </a>
          )}
          {profile.apple_music_url && (
            <a
              href={profile.apple_music_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-400 transition hover:text-white"
            >
              Apple Music
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
