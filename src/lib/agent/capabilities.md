# sidestage assistant — product capabilities (curated)

This document is injected into the assistant system prompt so the model knows what sidestage can do. **Keep it accurate** when shipping features; prefer updating `lib/agent/tool-schemas.ts` tool descriptions in parallel so behavior matches.

## Product areas (dashboard, signed-in artist)

- **Releases**: Singles, EPs, albums — draft through live; tracks, contributors, cover art, distribution-related flows.
- **Library (catalog)**: Per-song workspace — versions (e.g. MP3 for feedback), uploads, metadata tied to the artist account.
- **Feedback**: Shareable **guest** listen links on library versions. The listen URL is **not** stored as a full string in the database (the same DB is used from local dev and production, so the hostname would be wrong in one place). The canonical URL is **computed on the server** from the row’s UUID **token** plus **`NEXT_PUBLIC_APP_URL`**. The assistant retrieves it via **get_guest_listen_url** (one version) or **list_feedback_links** (**guestListenUrl** on each row) and must copy that string exactly. Timestamped comments from guests; artists review on **/feedback** (dashboard-only). Comment bodies: **list_feedback_comments** after resolving the version id.
- **Calendar**: Personal event calendar — single and recurring events (daily/weekly/monthly/yearly) with color labels, location, and meeting links. Release dates from the Releases section appear as read-only events. The assistant can read events via **list_calendar_events** and create/update/delete them as queued mutations.
- **CRM**: Contacts; collaborations linked to releases and library songs (with optional context notes).
- **Royalties**: Earnings / reporting data tied to releases (read-heavy in UI).
- **Settings**: Profile and account-facing preferences.

## Out of scope for the assistant (by policy)

- **Stripe / billing / admin-only** financial operations.
- **Any other user’s data** — tools only return the signed-in user’s rows (enforced by Supabase RLS).

## Mutations (create / update / delete)

The assistant has **mutation tools** (update/delete on releases, library songs, feedback links, CRM). Each call **queues a proposal**; the user must tap **Approve** or **Reject** in the assistant UI before anything is written. Until then, the database is unchanged.

- **Releases**: create **draft** releases; update metadata (not status); delete **draft** releases only.
- **Library**: create songs; add MP3 versions (from an **MP3** attached in chat → copied to `catalog_mp3`, or from a path already under `catalog_mp3` for that song); update version label / display name; delete a version (removes storage) or delete the whole song (removes **all** version files in `catalog_mp3` for that song, then the row).
- **Feedback**: create the share row for a version (once per version); enable/disable the guest listen link.
- **CRM**: **create** new contacts; **update** existing rows (by id from list); delete contact (and collaboration rows via FK cascade where applicable).
- **Calendar**: **create** events (single or recurring); **update** events with scope — `this` (one occurrence), `following` (this and future), or `all` (entire series); **delete** events with the same scopes.

## Attachments in chat

Users may attach **images** (for vision-capable models), **CSV** (text extracted for context), and **audio** (referenced by filename/type; transcription is not guaranteed in v1).
