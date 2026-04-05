-- Profiles: extends auth.users with artist info
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  artist_name text not null,
  slug text unique not null,
  bio text,
  avatar_url text,
  website text,
  instagram text,
  twitter text,
  spotify_url text,
  apple_music_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by anyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, artist_name, slug)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'artist_name', split_part(new.email, '@', 1)),
    lower(replace(coalesce(new.raw_user_meta_data->>'artist_name', split_part(new.email, '@', 1)), ' ', '-')) || '-' || substr(new.id::text, 1, 8)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Releases
create table public.releases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  type text check (type in ('single', 'ep', 'album')) not null default 'single',
  cover_art_url text,
  upc text,
  release_date date,
  status text check (status in ('draft', 'submitted', 'processing', 'live', 'rejected')) not null default 'draft',
  genre text,
  description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.releases enable row level security;

create policy "Users can view their own releases"
  on public.releases for select using (auth.uid() = user_id);

create policy "Users can create releases"
  on public.releases for insert with check (auth.uid() = user_id);

create policy "Users can update their own releases"
  on public.releases for update using (auth.uid() = user_id);

create policy "Users can delete draft releases"
  on public.releases for delete using (auth.uid() = user_id and status = 'draft');

-- Public view for live releases (artist profile pages)
create policy "Anyone can view live releases"
  on public.releases for select using (status = 'live');

-- Tracks
create table public.tracks (
  id uuid default gen_random_uuid() primary key,
  release_id uuid references public.releases(id) on delete cascade not null,
  title text not null,
  track_number integer not null,
  isrc text,
  wav_url text,
  duration_seconds integer,
  genre text,
  explicit boolean default false not null,
  created_at timestamptz default now() not null
);

alter table public.tracks enable row level security;

create policy "Users can view tracks of their releases"
  on public.tracks for select using (
    exists (
      select 1 from public.releases
      where releases.id = tracks.release_id
      and (releases.user_id = auth.uid() or releases.status = 'live')
    )
  );

create policy "Users can manage tracks of their releases"
  on public.tracks for insert with check (
    exists (
      select 1 from public.releases
      where releases.id = tracks.release_id and releases.user_id = auth.uid()
    )
  );

create policy "Users can update tracks of their releases"
  on public.tracks for update using (
    exists (
      select 1 from public.releases
      where releases.id = tracks.release_id and releases.user_id = auth.uid()
    )
  );

create policy "Users can delete tracks of their draft releases"
  on public.tracks for delete using (
    exists (
      select 1 from public.releases
      where releases.id = tracks.release_id
      and releases.user_id = auth.uid()
      and releases.status = 'draft'
    )
  );

-- Contributors
create table public.contributors (
  id uuid default gen_random_uuid() primary key,
  track_id uuid references public.tracks(id) on delete cascade not null,
  name text not null,
  role text check (role in (
    'primary_artist', 'featured_artist', 'producer',
    'songwriter', 'composer', 'mixer', 'mastering_engineer'
  )) not null
);

alter table public.contributors enable row level security;

create policy "Contributors are viewable with their tracks"
  on public.contributors for select using (
    exists (
      select 1 from public.tracks
      join public.releases on releases.id = tracks.release_id
      where tracks.id = contributors.track_id
      and (releases.user_id = auth.uid() or releases.status = 'live')
    )
  );

create policy "Users can manage contributors of their tracks"
  on public.contributors for insert with check (
    exists (
      select 1 from public.tracks
      join public.releases on releases.id = tracks.release_id
      where tracks.id = contributors.track_id and releases.user_id = auth.uid()
    )
  );

create policy "Users can update contributors"
  on public.contributors for update using (
    exists (
      select 1 from public.tracks
      join public.releases on releases.id = tracks.release_id
      where tracks.id = contributors.track_id and releases.user_id = auth.uid()
    )
  );

create policy "Users can delete contributors"
  on public.contributors for delete using (
    exists (
      select 1 from public.tracks
      join public.releases on releases.id = tracks.release_id
      where tracks.id = contributors.track_id and releases.user_id = auth.uid()
    )
  );

-- Royalties
create table public.royalties (
  id uuid default gen_random_uuid() primary key,
  release_id uuid references public.releases(id) on delete cascade not null,
  dsp_name text not null,
  period text not null,
  stream_count integer default 0 not null,
  earnings_amount numeric(12,4) default 0 not null,
  currency text default 'USD' not null,
  created_at timestamptz default now() not null
);

alter table public.royalties enable row level security;

create policy "Users can view royalties for their releases"
  on public.royalties for select using (
    exists (
      select 1 from public.releases
      where releases.id = royalties.release_id and releases.user_id = auth.uid()
    )
  );

-- Donations
create table public.donations (
  id uuid default gen_random_uuid() primary key,
  donor_name text,
  donor_email text,
  amount numeric(10,2) not null,
  currency text default 'USD' not null,
  stripe_payment_id text unique not null,
  message text,
  created_at timestamptz default now() not null
);

alter table public.donations enable row level security;

-- Indexes
create index idx_releases_user_id on public.releases(user_id);
create index idx_releases_status on public.releases(status);
create index idx_tracks_release_id on public.tracks(release_id);
create index idx_contributors_track_id on public.contributors(track_id);
create index idx_royalties_release_id on public.royalties(release_id);
create index idx_profiles_slug on public.profiles(slug);

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger set_updated_at before update on public.releases
  for each row execute function public.update_updated_at();

-- Storage buckets (run in Supabase dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('tracks', 'tracks', false);
-- insert into storage.buckets (id, name, public) values ('artwork', 'artwork', true);
-- Catalog MP3 bucket (private): see block at end of this file for `catalog_mp3` + policies.

-- ========== Catalog (per-artist songs, separate from distribution releases) ==========

create table public.catalog_songs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  release_id uuid references public.releases(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.catalog_songs enable row level security;

create policy "Users can view their catalog songs"
  on public.catalog_songs for select using (auth.uid() = user_id);

create policy "Users can insert catalog songs"
  on public.catalog_songs for insert with check (
    auth.uid() = user_id
    and (
      release_id is null
      or exists (
        select 1 from public.releases r
        where r.id = release_id and r.user_id = auth.uid()
      )
    )
  );

create policy "Users can update catalog songs"
  on public.catalog_songs for update using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and (
      release_id is null
      or exists (
        select 1 from public.releases r
        where r.id = release_id and r.user_id = auth.uid()
      )
    )
  );

create policy "Users can delete catalog songs"
  on public.catalog_songs for delete using (auth.uid() = user_id);

create table public.catalog_song_versions (
  id uuid default gen_random_uuid() primary key,
  catalog_song_id uuid references public.catalog_songs(id) on delete cascade not null,
  label text,
  storage_path text not null,
  file_name text not null,
  created_at timestamptz default now() not null
);

alter table public.catalog_song_versions enable row level security;

create policy "Users can view versions of their catalog songs"
  on public.catalog_song_versions for select using (
    exists (
      select 1 from public.catalog_songs s
      where s.id = catalog_song_versions.catalog_song_id and s.user_id = auth.uid()
    )
  );

create policy "Users can insert catalog versions"
  on public.catalog_song_versions for insert with check (
    exists (
      select 1 from public.catalog_songs s
      where s.id = catalog_song_versions.catalog_song_id and s.user_id = auth.uid()
    )
  );

create policy "Users can update catalog versions"
  on public.catalog_song_versions for update using (
    exists (
      select 1 from public.catalog_songs s
      where s.id = catalog_song_versions.catalog_song_id and s.user_id = auth.uid()
    )
  );

create policy "Users can delete catalog versions"
  on public.catalog_song_versions for delete using (
    exists (
      select 1 from public.catalog_songs s
      where s.id = catalog_song_versions.catalog_song_id and s.user_id = auth.uid()
    )
  );

-- ========== CRM contacts (per artist) ==========

create table public.crm_contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  email text,
  instagram text,
  tiktok text,
  role text,
  notes text,
  last_contacted_at date,
  status text not null default 'active',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.crm_contacts enable row level security;

create policy "Users can view their CRM contacts"
  on public.crm_contacts for select using (auth.uid() = user_id);

create policy "Users can insert CRM contacts"
  on public.crm_contacts for insert with check (auth.uid() = user_id);

create policy "Users can update CRM contacts"
  on public.crm_contacts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete CRM contacts"
  on public.crm_contacts for delete using (auth.uid() = user_id);

create table public.crm_contact_collaborations (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references public.crm_contacts(id) on delete cascade not null,
  release_id uuid references public.releases(id) on delete cascade,
  catalog_song_id uuid references public.catalog_songs(id) on delete cascade,
  constraint crm_collab_one_target check (
    (release_id is not null and catalog_song_id is null)
    or (release_id is null and catalog_song_id is not null)
  )
);

alter table public.crm_contact_collaborations enable row level security;

create unique index crm_collab_contact_release_unique
  on public.crm_contact_collaborations (contact_id, release_id)
  where release_id is not null;

create unique index crm_collab_contact_catalog_unique
  on public.crm_contact_collaborations (contact_id, catalog_song_id)
  where catalog_song_id is not null;

create policy "Users can view collaborations for their contacts"
  on public.crm_contact_collaborations for select using (
    exists (
      select 1 from public.crm_contacts c
      where c.id = crm_contact_collaborations.contact_id and c.user_id = auth.uid()
    )
  );

create policy "Users can insert collaborations"
  on public.crm_contact_collaborations for insert with check (
    exists (
      select 1 from public.crm_contacts c
      where c.id = contact_id and c.user_id = auth.uid()
    )
    and (
      (
        release_id is not null
        and catalog_song_id is null
        and exists (
          select 1 from public.releases r
          where r.id = release_id and r.user_id = auth.uid()
        )
      )
      or (
        catalog_song_id is not null
        and release_id is null
        and exists (
          select 1 from public.catalog_songs s
          where s.id = catalog_song_id and s.user_id = auth.uid()
        )
      )
    )
  );

create policy "Users can delete collaborations"
  on public.crm_contact_collaborations for delete using (
    exists (
      select 1 from public.crm_contacts c
      where c.id = crm_contact_collaborations.contact_id and c.user_id = auth.uid()
    )
  );

create index idx_catalog_songs_user_id on public.catalog_songs(user_id);
create index idx_catalog_songs_release_id on public.catalog_songs(release_id);
create index idx_catalog_song_versions_song_id on public.catalog_song_versions(catalog_song_id);
create index idx_crm_contacts_user_id on public.crm_contacts(user_id);
create index idx_crm_collab_contact_id on public.crm_contact_collaborations(contact_id);

create trigger set_updated_at before update on public.catalog_songs
  for each row execute function public.update_updated_at();

create trigger set_updated_at before update on public.crm_contacts
  for each row execute function public.update_updated_at();

-- Storage: catalog MP3 files (object path: {user_id}/{catalog_song_id}/{filename})
-- Run the following block once in the Supabase SQL editor after the tables above exist.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog_mp3', 'catalog_mp3', false, 52428800, array['audio/mpeg', 'audio/mp3'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "catalog_mp3 select own" on storage.objects;
drop policy if exists "catalog_mp3 insert own" on storage.objects;
drop policy if exists "catalog_mp3 update own" on storage.objects;
drop policy if exists "catalog_mp3 delete own" on storage.objects;

create policy "catalog_mp3 select own"
  on storage.objects for select using (
    bucket_id = 'catalog_mp3' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "catalog_mp3 insert own"
  on storage.objects for insert with check (
    bucket_id = 'catalog_mp3' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "catalog_mp3 update own"
  on storage.objects for update using (
    bucket_id = 'catalog_mp3' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "catalog_mp3 delete own"
  on storage.objects for delete using (
    bucket_id = 'catalog_mp3' and (storage.foldername(name))[1] = auth.uid()::text
  );
