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
