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
  website text,
  roles text[] not null default '{}'::text[],
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
  note text,
  created_at timestamptz default now() not null,
  constraint crm_collab_one_target check (
    (release_id is not null and catalog_song_id is null)
    or (release_id is null and catalog_song_id is not null)
  )
);

alter table public.crm_contact_collaborations enable row level security;

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

create policy "Users can update collaborations"
  on public.crm_contact_collaborations for update using (
    exists (
      select 1 from public.crm_contacts c
      where c.id = crm_contact_collaborations.contact_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.crm_contacts c
      where c.id = crm_contact_collaborations.contact_id and c.user_id = auth.uid()
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

-- ---- Upgrade: CRM collaborations one-to-many + note (safe to re-run) ----
-- Removes unique constraints so the same contact can link to the same release or catalog song multiple times (e.g. multiple sessions / credits).

alter table public.crm_contact_collaborations add column if not exists note text;
alter table public.crm_contact_collaborations
  add column if not exists created_at timestamptz not null default now();

drop index if exists crm_collab_contact_release_unique;
drop index if exists crm_collab_contact_catalog_unique;

drop policy if exists "Users can update collaborations" on public.crm_contact_collaborations;

create policy "Users can update collaborations"
  on public.crm_contact_collaborations for update using (
    exists (
      select 1 from public.crm_contacts c
      where c.id = crm_contact_collaborations.contact_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.crm_contacts c
      where c.id = crm_contact_collaborations.contact_id and c.user_id = auth.uid()
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

-- ========== Feedback (time-annotated comments on library MP3 versions) ==========
-- One share row per catalog_song_version (simplest model). Public access uses token in URL;
-- guest writes go through Next.js API routes (service role). Owners use dashboard + RLS.

create table public.feedback_version_links (
  id uuid default gen_random_uuid() primary key,
  catalog_song_version_id uuid not null unique references public.catalog_song_versions(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  enabled boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.feedback_version_links enable row level security;

create policy "Owners select feedback links"
  on public.feedback_version_links for select using (
    exists (
      select 1 from public.catalog_song_versions v
      join public.catalog_songs s on s.id = v.catalog_song_id
      where v.id = feedback_version_links.catalog_song_version_id
        and s.user_id = auth.uid()
    )
  );

create policy "Owners insert feedback links"
  on public.feedback_version_links for insert with check (
    exists (
      select 1 from public.catalog_song_versions v
      join public.catalog_songs s on s.id = v.catalog_song_id
      where v.id = feedback_version_links.catalog_song_version_id
        and s.user_id = auth.uid()
    )
  );

create policy "Owners update feedback links"
  on public.feedback_version_links for update using (
    exists (
      select 1 from public.catalog_song_versions v
      join public.catalog_songs s on s.id = v.catalog_song_id
      where v.id = feedback_version_links.catalog_song_version_id
        and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.catalog_song_versions v
      join public.catalog_songs s on s.id = v.catalog_song_id
      where v.id = feedback_version_links.catalog_song_version_id
        and s.user_id = auth.uid()
    )
  );

create policy "Owners delete feedback links"
  on public.feedback_version_links for delete using (
    exists (
      select 1 from public.catalog_song_versions v
      join public.catalog_songs s on s.id = v.catalog_song_id
      where v.id = feedback_version_links.catalog_song_version_id
        and s.user_id = auth.uid()
    )
  );

create table public.feedback_comments (
  id uuid default gen_random_uuid() primary key,
  feedback_link_id uuid not null references public.feedback_version_links(id) on delete cascade,
  parent_id uuid references public.feedback_comments(id) on delete cascade,
  body text not null,
  seconds_into_track double precision,
  display_name text,
  giver_secret uuid not null,
  created_at timestamptz default now() not null,
  constraint feedback_comments_body_len check (char_length(trim(body)) between 1 and 2000),
  constraint feedback_comments_display_name_len check (
    display_name is null or char_length(trim(display_name)) between 1 and 80
  ),
  constraint feedback_comments_seconds_rule check (
    (parent_id is null and seconds_into_track is not null and seconds_into_track >= 0)
    or (parent_id is not null and seconds_into_track is null)
  )
);

alter table public.feedback_comments enable row level security;

create policy "Owners select feedback comments"
  on public.feedback_comments for select using (
    exists (
      select 1 from public.feedback_version_links fl
      join public.catalog_song_versions v on v.id = fl.catalog_song_version_id
      join public.catalog_songs s on s.id = v.catalog_song_id
      where fl.id = feedback_comments.feedback_link_id
        and s.user_id = auth.uid()
    )
  );

create policy "Owners delete feedback comments"
  on public.feedback_comments for delete using (
    exists (
      select 1 from public.feedback_version_links fl
      join public.catalog_song_versions v on v.id = fl.catalog_song_version_id
      join public.catalog_songs s on s.id = v.catalog_song_id
      where fl.id = feedback_comments.feedback_link_id
        and s.user_id = auth.uid()
    )
  );

create policy "Owners insert feedback comments"
  on public.feedback_comments for insert
  with check (
    exists (
      select 1 from public.feedback_version_links fl
      join public.catalog_song_versions v on v.id = fl.catalog_song_version_id
      join public.catalog_songs s on s.id = v.catalog_song_id
      where fl.id = feedback_comments.feedback_link_id
        and s.user_id = auth.uid()
    )
  );

create or replace function public.feedback_comments_parent_must_be_root()
returns trigger as $$
begin
  if new.parent_id is not null then
    if exists (
      select 1 from public.feedback_comments p
      where p.id = new.parent_id and p.parent_id is not null
    ) then
      raise exception 'Feedback replies may only attach to a top-level comment';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists feedback_comments_parent_root on public.feedback_comments;
create trigger feedback_comments_parent_root
  before insert on public.feedback_comments
  for each row execute function public.feedback_comments_parent_must_be_root();

create index idx_feedback_comments_link_id on public.feedback_comments(feedback_link_id);
create index idx_feedback_comments_parent_id on public.feedback_comments(parent_id);

create trigger set_updated_at before update on public.feedback_version_links
  for each row execute function public.update_updated_at();

-- ---- Agent assistant: threads, messages, attachment storage ----

create table public.agent_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.agent_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text,
  tool_calls jsonb,
  tool_call_id text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_agent_threads_user_id on public.agent_threads (user_id);
create index idx_agent_threads_updated_at on public.agent_threads (user_id, updated_at desc);
create index idx_agent_messages_thread_id on public.agent_messages (thread_id, created_at);

alter table public.agent_threads enable row level security;
alter table public.agent_messages enable row level security;

create policy "Users manage own agent threads"
  on public.agent_threads for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read messages in own threads"
  on public.agent_messages for select using (
    exists (
      select 1 from public.agent_threads t
      where t.id = agent_messages.thread_id and t.user_id = auth.uid()
    )
  );

create policy "Users insert messages in own threads"
  on public.agent_messages for insert with check (
    exists (
      select 1 from public.agent_threads t
      where t.id = agent_messages.thread_id and t.user_id = auth.uid()
    )
  );

create policy "Users delete messages in own threads"
  on public.agent_messages for delete using (
    exists (
      select 1 from public.agent_threads t
      where t.id = agent_messages.thread_id and t.user_id = auth.uid()
    )
  );

-- Assistant: mutations queued until the user approves in the UI
create table public.agent_mutation_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  thread_id uuid not null references public.agent_threads (id) on delete cascade,
  tool_name text not null,
  args jsonb not null default '{}'::jsonb,
  summary text not null,
  status text not null default 'pending' check (
    status in ('pending', 'executed', 'rejected', 'failed')
  ),
  result_message text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_agent_mutation_proposals_thread
  on public.agent_mutation_proposals (thread_id, created_at desc);

create index idx_agent_mutation_proposals_user_pending
  on public.agent_mutation_proposals (user_id, status)
  where status = 'pending';

alter table public.agent_mutation_proposals enable row level security;

create policy "Users manage own agent mutation proposals"
  on public.agent_mutation_proposals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_updated_at before update on public.agent_threads
  for each row execute function public.update_updated_at();

-- Assistant: single visible conversation — chain backend sessions + one active pointer per user
alter table public.agent_threads
  add column if not exists previous_thread_id uuid references public.agent_threads (id) on delete set null;

create index if not exists idx_agent_threads_previous
  on public.agent_threads (previous_thread_id)
  where previous_thread_id is not null;

create table if not exists public.assistant_conversation_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  active_thread_id uuid not null references public.agent_threads (id) on delete restrict,
  updated_at timestamptz not null default now()
);

create index if not exists idx_assistant_conversation_state_thread
  on public.assistant_conversation_state (active_thread_id);

alter table public.assistant_conversation_state enable row level security;

drop policy if exists "Users manage own assistant conversation state" on public.assistant_conversation_state;

create policy "Users manage own assistant conversation state"
  on public.assistant_conversation_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agent_attachments',
  'agent_attachments',
  false,
  26214400,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'text/csv', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave'
  ]
)
on conflict (id) do nothing;

drop policy if exists "agent_attachments select own" on storage.objects;
drop policy if exists "agent_attachments insert own" on storage.objects;
drop policy if exists "agent_attachments update own" on storage.objects;
drop policy if exists "agent_attachments delete own" on storage.objects;

create policy "agent_attachments select own"
  on storage.objects for select using (
    bucket_id = 'agent_attachments' and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "agent_attachments insert own"
  on storage.objects for insert with check (
    bucket_id = 'agent_attachments' and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "agent_attachments update own"
  on storage.objects for update using (
    bucket_id = 'agent_attachments' and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "agent_attachments delete own"
  on storage.objects for delete using (
    bucket_id = 'agent_attachments' and (storage.foldername (name))[1] = auth.uid()::text
  );

-- ============================================================
-- Calendar events
-- ============================================================
-- Single events:    recurrence IS NULL, recurrence_parent_id IS NULL
-- Recurring master: recurrence IS NOT NULL, recurrence_parent_id IS NULL
-- Exception (edit): recurrence_parent_id NOT NULL, is_exception_cancelled = false
-- Exception (del):  recurrence_parent_id NOT NULL, is_exception_cancelled = true
-- "This and following" edit/delete → truncate master end_date + optional new master
-- "All events" edit → update master row; delete → delete master (cascade exceptions)
-- Release dates appear on the calendar read-only (pulled from releases table in UI).
-- ============================================================

create table if not exists public.calendar_events (
  id                       uuid        primary key default gen_random_uuid(),
  user_id                  uuid        not null references auth.users(id) on delete cascade,
  title                    text        not null,
  description              text,
  start_at                 timestamptz not null,
  end_at                   timestamptz,
  all_day                  boolean     not null default false,
  color                    text        not null default 'default',
  location                 text,
  link                     text,
  -- JSONB recurrence rule: { frequency, interval, days_of_week?, end_date?, count? }
  recurrence               jsonb,
  -- Exception fields (null on master rows)
  recurrence_parent_id     uuid        references public.calendar_events(id) on delete cascade,
  recurrence_original_date date,
  is_exception_cancelled   boolean     not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_owner" on public.calendar_events;
create policy "calendar_events_owner"
  on public.calendar_events for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create trigger set_updated_at_calendar_events
  before update on public.calendar_events
  for each row execute function update_updated_at();
