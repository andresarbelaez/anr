import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ArtistHeader } from "@/components/profile/ArtistHeader";
import { Discography } from "@/components/profile/Discography";
import type { Profile, Release } from "@/lib/supabase/types";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ artist: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artist: slug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("artist_name")
    .eq("slug", slug)
    .single();

  if (!profile) return { title: "Artist not found" };

  return {
    title: `${profile.artist_name} — sidestage`,
    description: `Listen to music by ${profile.artist_name}`,
  };
}

export default async function ArtistProfilePage({ params }: Props) {
  const { artist: slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!profile) notFound();

  const { data: releases } = await supabase
    .from("releases")
    .select("*")
    .eq("user_id", profile.id)
    .eq("status", "live")
    .order("release_date", { ascending: false });

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <ArtistHeader profile={profile as Profile} />

        <div className="mt-12">
          <h2 className="mb-6 text-sm font-medium uppercase tracking-wider text-neutral-500">
            Discography
          </h2>
          <Discography releases={(releases as Release[]) || []} />
        </div>

        <footer className="mt-20 border-t border-neutral-900 pt-6 text-center text-xs text-neutral-600">
          Distributed for free with{" "}
          <a href="/" className="underline hover:text-neutral-400">
            sidestage
          </a>
        </footer>
      </div>
    </div>
  );
}
