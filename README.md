# Harmony

A quietly distinctive habit-tracking PWA. The premise: your habits are how you return to yourself, not tasks you're failing at. Built around a soft radial visual called the Bloom and a rules-based engine that brings your own words back to you when an area of life has been quiet too long.

## What it does

- Capture areas of life that matter to you, in your own words.
- Track habits inside those areas with flexible cadences (daily, weekly, every-n-days).
- See your week as a Bloom: petals fill as you tend to each area, dim quietly when you don't.
- Get gentle on-device push notifications when an area you said mattered has gone quiet. The reminder uses your own onboarding sentence verbatim.
- Read a calm weekly recap on Sunday morning, written from your own data.

No streaks. No shame. No plant pets. No score.

## Stack

| Layer | Choice |
| --- | --- |
| Build | Vite |
| Framework | React 18 + TypeScript |
| Routing | React Router v6 |
| Local DB | Dexie (IndexedDB) |
| State | Zustand |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| PWA tooling | `vite-plugin-pwa` (Workbox) |
| Auth + sync | Supabase (free tier) |
| Push backend | Cloudflare Worker + D1 + cron triggers |
| Weather context | Open-Meteo (no key) |

## Repo layout

```
harmony/
  apps/
    web/              # the PWA
    push-worker/      # Cloudflare Worker for push delivery
  packages/
    shared/           # types and template logic shared between web and worker
  harmony-claude-code-spec.md   # full build specification
```

## Getting started

```bash
pnpm install
pnpm --filter @harmony/web dev
```

Then open `http://localhost:5173`.

For the push worker:

```bash
cd apps/push-worker
pnpm wrangler dev
```

## Environment

Copy `.env.example` to `.env.local` in `apps/web` and fill in:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=
VITE_PUSH_WORKER_URL=
```

The Cloudflare Worker needs these secrets set via `wrangler secret put`:

```
VAPID_PUBLIC
VAPID_PRIVATE
VAPID_SUBJECT
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Generate VAPID keys with `npx web-push generate-vapid-keys`.

## Building this with Claude Code

`harmony-claude-code-spec.md` is the source of truth. Attach it to every Claude Code session. Build phases are listed in section 19 of that file; work one phase at a time and stop to review.

## Voice and design

Two rules carry the whole aesthetic:

- No em dashes. Anywhere. Ever.
- The user's own words always come back unchanged.

Everything else is in the spec.
