# Harmony

A calm, distinctive habit-tracking PWA. The premise: your habits are how you return to yourself, not tasks you are failing at. Built around a soft radial visual called the Bloom and a rules-based engine that brings your own words back to you when an area of life has gone untended too long.

No streaks. No shame. No plant pets. No score.

## What it does

- **Areas of life, in your own words.** Name what matters, give each a colour, a note on why it matters, and a place in your priority order. Up to twelve.
- **Habits with real cadences.** Daily, specific weekdays, a number of times a week, every few days, every few weeks, or every few months (covering fortnightly, monthly, quarterly, yearly), each with a start date and optional end. Habits can carry a reminder time and a duration.
- **The Bloom.** Your week as a living flower: each petal is an area, growing as you tend it and easing back when it goes untended. It reads a two-week window, recalculated daily, so one missed day never undoes things. Two tiers shape a petal: how much the area matters (lower-stakes areas fill more readily, drawing the eye to what you said matters most) and how each habit is doing, by a weight you can set per habit.
- **Tugs.** Negative habits you want to ease off. Never scheduled; you note them on the days they happen and they gently pull back that area, so a week shows the lift and the drag, the honest whole. Muted, outlined styling so they never read as an alarm.
- **An editable Log.** A calm month view of what you tended to, with your notes. Tap any past day to fix the record: mark something you forgot, or unmark a mistaken tap.
- **Insights.** A weekly recap written from your own week, area balance at a glance, and a gentle suggestion or two, all drawn from what you actually did.
- **Reminders that arrive.** Web push that lands within about a minute of the time you set, on the days a habit is due, on every device you turn it on. Per-device subscriptions, do-not-disturb hours, and a per-area mute. An optional evening note rounds up anything still unlogged.
- **An in-app guide.** "How Harmony works": a What's new side (latest release in focus, full version history below, each with a little picture of the feature) and an illustrated walk-through of everything. Shown once after onboarding, reachable any time under Me.
- **Multi-device, offline-first sync.** Sign in anywhere and your areas, habits, and history are simply there, staying in sync as you go. Works offline and catches up on reconnect.
- **Account management.** Password reset from an email link, and a real account deletion that removes the auth user, not only the data.

## Stack

| Layer | Choice |
| --- | --- |
| Build | Vite |
| Framework | React 18 + TypeScript |
| Routing | React Router v6 (lazy routes) |
| Local DB | Dexie (IndexedDB), source of truth |
| State | Zustand |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| PWA tooling | `vite-plugin-pwa` (Workbox) |
| Auth, data, realtime | Supabase (free tier): PostgREST + RLS + Realtime |
| Push backend | Cloudflare Worker, cron trigger every minute |
| Web push | Web Crypto (SubtleCrypto) VAPID + aes128gcm, no Node deps |
| Weather context | Open-Meteo (optional, no key) |

The web app frontend is hosted on Cloudflare Pages; push delivery runs as a separate Cloudflare Worker.

## How sync works

Dexie is the source of truth on each device. Writes are mirrored to Supabase and, when offline, queued in a durable outbox that flushes on reconnect. Live changes arrive over Supabase Realtime, with focus, online, and a periodic poll as backstops, and an authoritative pull on sign-in that reconciles local against cloud. Signing out wipes local data so shared devices stay private.

## Repo layout

```
harmony/
  apps/
    web/              # the PWA
    push-worker/      # Cloudflare Worker for push delivery (Web Crypto)
  packages/
    shared/           # types, scheduling, and template/drift engine shared by web and worker
  supabase/
    migrations/       # SQL, applied by hand in the Supabase SQL editor
  harmony-claude-code-spec.md   # full build specification
```

The template + drift engine and its date helpers live once in `packages/shared`; the web and worker copies are thin re-export shims so the logic is single-sourced and byte-identical.

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
TEST_PUSH_SECRET
```

Generate VAPID keys with `npx web-push generate-vapid-keys` (the keys only; runtime push uses Web Crypto, so `web-push` is not a runtime dependency). The service role key lives only in worker secrets, never in the browser.

Apply the SQL in `supabase/migrations/` in order, in the Supabase SQL editor.

## Free-tier capacity

Storage is comfortable for years (the `logs` table is the only real grower, at roughly 1 to 1.5 MB per heavy user per year against a 500 MB limit). The one thing to watch over time is Supabase egress, since the log pull is currently unbounded and runs on a foreground poll; windowing the pull and easing the poll keeps a handful of heavy users well inside the free tier indefinitely. No platform migration is warranted at this scale.

## Building this with Claude Code

`harmony-claude-code-spec.md` is the source of truth. Attach it to every Claude Code session. Build phases are listed in section 19 of that file; work one phase at a time and stop to review.

## Voice and design

Two rules carry the whole aesthetic:

- No em dashes. Anywhere. Ever.
- The user's own words always come back unchanged.

Everything else is in the spec.
