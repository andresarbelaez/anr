-- Catalog owners can add top-level comments and replies on their feedback links (studio detail screen).
drop policy if exists "Owners insert feedback comments" on public.feedback_comments;

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
