# Changelog

Notable changes to **sidestage** (this Next.js app) are recorded here for **human contributors** and **future open-source** readers.

> Agent-oriented, exhaustive handoff notes may live in a local-only `context.md` (gitignored); this file is the **versioned**, shareable history.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions use [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and stay in sync with `package.json`.

## [Unreleased]

Nothing yet.

## [0.2.0] - 2026-04-09

### Added

- This changelog; [`README.md`](./README.md) links here for release notes.

### Changed

- **Studio-first signed-in UX:** `/home` is the main room; other `(dashboard)/*` routes `redirect()` into `/home` with `open=` or deep-link params (`releaseId`, `catalogSongId`, `crmContactId`, `feedbackVersion`, etc.).
- **My Profile URL:** studio uses `open=my-profile` (window id `my-profile`). `open=settings` is not aliased to profile so a future Settings micro-app can own it.
- **Redirects:** `/settings`, `/releases/new`, `/catalog/new`, and `/crm/new` send users into the studio with the matching app (use in-window “new” flows from there).
- **Global scrollbars:** thin neutral track/thumb in `globals.css` (WebKit + Firefox), aligned with the calendar week floating scroll affordance.
- **Calendar forms:** tighter `SplitDateInput` (MM/DD/YYYY) plus studio-specific CSS for split-date fields where needed.
- **`MicroappAudioPlayerBar`:** embedded strip only; removed the old fixed viewport-bottom “dashboard” variant.

### Removed

- **Legacy dashboard shell:** `DashboardNavChrome`, `CatalogPlayerBar`, and layout padding tied to the bottom player.
- **`ArtistProfileSettingsForm` “dashboard” variant** and standalone `/settings` page UI (profile only in `StudioSettingsWindow`).
- **Unused list/CSV helpers:** `ReleaseCard`, `RoyaltyChart`, `CsvToolbar`, `DashboardCsvIoBanner`, `use-dashboard-csv-io`, and the old `catalog/new` full-page client (CSV export/import remains inline in studio Library and Contacts).

## [0.1.1] - 2026-04-08

### Changed

- `/home` as studio room, nav + calendar polish (legacy `/studio` → `/home`); top nav hidden on `/home`.
- Unified app scrollbar styling; compact calendar date digit inputs; further calendar props and week/month UX (see git history for detail).

## [0.1.0] - 2026-04-07

### Added

- Studio mobile shell, session cache, and related studio groundwork.
