# sidestage app

Free studio for independent artists — catalog, releases, CRM, calendar, feedback, and sidestage-1. Distribution to streaming platforms is **not live yet** (mock adapter until a white-label partner is integrated).

## Changelog

Human-readable release notes live in **[CHANGELOG.md](./CHANGELOG.md)** (Keep a Changelog style, versioned with `package.json`). Use it for open-source and contributor handoffs; day-to-day agent context may stay in a private `context.md` if you use one.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Auth / DB / Storage**: Supabase
- **Distribution**: Pluggable adapter pattern (mock included, swap for Labelcamp/SonoSuite API)
- **Payments**: Stripe (donation-based)

## Getting Started

### 1. Install dependencies

```bash
cd app
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL schema in `src/lib/supabase/schema.sql` via the Supabase SQL Editor
3. Create two storage buckets: `tracks` (private) and `artwork` (public)

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your Supabase URL and anon key from the Supabase dashboard.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    (auth)/          — Login and signup pages
    (dashboard)/     — Protected shell; **`/home`** studio room + **`redirect()`** shims into **`/home?…`**
    [artist]/        — Public artist profile pages
    api/             — API routes (distribution, Stripe webhooks)
    donate/          — Donation page
  components/
    upload/          — Track uploader, cover art, metadata form, review
    dashboard/       — Calendar UI, shared form/modal pieces, `StatusBadge` (studio embeds most product UI)
    profile/         — Artist header, discography grid
    ui/              — Shared UI primitives (button, input, select)
  lib/
    supabase/        — Client, server, middleware, types, schema
    distribution/    — Adapter interface, mock adapter
    utils/           — Audio validation, metadata validation, cn()
```

## Distribution Adapter

The app uses a pluggable adapter pattern for distribution. During development, a mock adapter simulates the full release lifecycle. To connect a real distribution backend:

1. Implement the `DistributionAdapter` interface in `src/lib/distribution/adapter.ts`
2. Swap the adapter in `src/lib/distribution/index.ts`

## Deployment Checklist

When deploying to production with a real domain, update these:

- [ ] **`.env.local`** — Set `NEXT_PUBLIC_APP_URL` to your production URL
- [ ] **Supabase > Authentication > URL Configuration > Site URL** — Change from `http://localhost:3000` to your production URL (e.g. `https://yourdomain.com`)
- [ ] **Supabase > Authentication > URL Configuration > Redirect URLs** — Add `https://yourdomain.com/auth/callback` (keep localhost for dev)
- [ ] **Supabase > Authentication > Email Templates** — Update any links that reference localhost
- [ ] **Supabase Storage** — If upgrading to Pro, update `MAX_WAV_SIZE` in `src/lib/utils/audio-validation.ts`
- [ ] **Stripe** — Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to env, configure webhook endpoint to `https://yourdomain.com/api/webhooks/stripe`
- [ ] **SMTP** — Configure a custom SMTP provider in Supabase (Resend, Postmark, or SendGrid) for reliable email delivery

## License

MIT
