# Harmony — Claude Code Build Specification

This is the complete brief for building Harmony, a habit-tracking PWA. Hand this whole file to Claude Code. The order of sections is also the order to build in. Every locked decision was made deliberately; do not relitigate the stack, palette, or naming.

If you ever feel like adding em dashes, streaks, plants that die, shaming copy, motivational quotes, gradients on top-level UI containers, or a second brand colour, stop. Those are all out of bounds.

---

## 0. Mission and philosophy

Harmony is built on the inverse premise of every other habit tracker in the category. Not "we will motivate you with streaks and shame" but "these habits are how you return to yourself". The whole product is arranged so that the user's own voice, captured in onboarding, comes back to them at the moments they need to hear it. Missing a habit is never red. A quiet area is dim, not broken. Productivity is a natural extension of living one's own life, never the point.

Seven principles, in priority order:

1. Calm over loud.
2. Paper, not glass.
3. Content first, chrome at the edge.
4. Native on iOS and iPad, not "web app".
5. Motion with physics, used sparingly.
6. Instant and trustworthy (local-first, optimistic).
7. Warm, plain voice. No em dashes, ever.

The central visual object is **the Bloom**: a radial dial where each petal is a Life Area. A petal fills as you tend to that area and dims when it's quiet. Never a number. Never a score. Never a streak.

---

## 1. Voice and copy rules (apply everywhere)

- **No em dashes or en dashes anywhere.** Use commas, periods, colons, or parentheses instead. This is part of the aesthetic.
- Sentence case for everything except proper nouns. "Add habit", not "Add Habit".
- Second person, warm but never gushing. "You're in a good rhythm" beats "Great job!".
- Active voice, verb-first buttons. "Add habit", not "Habit creation".
- Empty states are invitations, not apologies. "Add your first habit", not "Nothing here yet".
- No "successfully", no "please", no exclamation marks on system copy.
- Use the user's own onboarding sentences verbatim when surfacing nudges. Never paraphrase the user.
- The word "streak" never appears in the UI. Neither does "consistency" used as a metric. "Tended", "tended to", "rhythm", and "presence" are okay.

---

## 2. Tech stack (locked)

| Concern | Choice |
| --- | --- |
| Bundler | Vite |
| Framework | React 18 with TypeScript |
| Routing | React Router v6 |
| Local DB | Dexie (IndexedDB) |
| State | Zustand |
| Styling | Tailwind CSS with extended theme |
| Animation | Framer Motion |
| PWA tooling | `vite-plugin-pwa` (Workbox under the hood) |
| Auth and sync | Supabase free tier |
| Push backend | Cloudflare Worker + D1 + Cron Triggers |
| Push library | `web-push` (Node-compatible, inside the Worker) |
| Weather (nudge context) | Open-Meteo (no API key needed) |

No email service. No third-party notification SDK. Notifications are on-device, via the Web Push API to the home-screen-installed PWA, behaving like native app notifications (sound, banner, lock screen).

---

## 3. Project structure

Two packages, one repo:

```
harmony/
  apps/
    web/                     # the PWA
      public/
        manifest.webmanifest
        icons/               # maskable icons in multiple sizes
      src/
        app/
          Shell.tsx          # sidebar (md+) / bottom tab bar (phone)
          Router.tsx
          AuthGate.tsx
        screens/
          onboarding/
          home/
          areas/
          habit/             # nested habit detail
          log/
          insights/
          settings/
        components/
          Bloom/             # the central radial visual
          HabitCard/
          AreaChip/
          BottomSheet/       # portaled, keyboard-lifting
          Modal/             # portaled, centered
          FAB/
          SyncDot/
          Toast/
          WatercolorWash/    # the signature element
          ProgressDots/      # onboarding progress
          SoftHeatmap/       # 28-day dot heatmap
        lib/
          db/                # Dexie schema and queries
            schema.ts
            queries.ts
          supabase/          # client + sync
            client.ts
            sync.ts
          push/              # subscribe, permissions, install detection
            subscribe.ts
            install.ts
          templates/         # nudge templates and composer
            library.ts
            composer.ts
            history.ts
          drift/             # drift detection engine
            detect.ts
            cadence.ts
          insights/          # rules-based weekly recap
            recap.ts
          time/              # date helpers, "5 days ago", time-of-day
          weather/           # Open-Meteo client
        store/
          useUser.ts
          useAreas.ts
          useHabits.ts
          useLogs.ts
          useSync.ts
        styles/
          tokens.css         # CSS variables, fonts
          native-feel.css    # the viewport / safe-area / scroll system
          index.css
        sw.ts                # service worker source (Workbox + push handlers)
        main.tsx
      vite.config.ts
      tailwind.config.ts
      tsconfig.json
    push-worker/             # Cloudflare Worker (separate, lightweight)
      src/
        index.ts             # cron + HTTP routes
        webpush.ts
        templates.ts         # mirrors apps/web/src/lib/templates
        drift.ts             # mirrors apps/web/src/lib/drift
      wrangler.toml
      schema.sql             # D1 schema
  packages/
    shared/                  # types shared between web and worker
      src/
        types.ts
        templateTypes.ts
        constants.ts
  package.json               # pnpm workspaces or npm workspaces
  pnpm-workspace.yaml
  README.md
```

---

## 4. Visual design system

### 4.1 Palette

Base surfaces and ink come from the Quiet Paper system. Primary is a dyed iris violet.

```js
// tailwind.config.ts theme.extend.colors
parchment: { 50:'#FDFCF9', 100:'#FAF9F6', 200:'#F0EDE6', 300:'#E0DCD2' },
ink:       { 900:'#1A1A18', 700:'#3D3D38', 500:'#6B6960', 300:'#9B9890', 100:'#D4D2CB' },
iris:      { 700:'#3A2870', 600:'#4A3878', 500:'#574887', 400:'#6E5FA0', 100:'#EDE8F5', 50:'#F6F3FA' },  // primary
rose:      { 600:'#A14A5E', 500:'#B85C72', 100:'#F3E2E6' }, // gentle "below" status (used sparingly)
sage:      { 600:'#3D5A3E', 500:'#4F7942', 100:'#E8F0E6' }, // "in a good rhythm" status
```

Area accent palette (dyed half a stop deeper than Quiet Paper's reference set, less candy, more pigment):

```
Sage         #4A7038
Emerald      #2B7558
Teal         #267A7A
Ocean        #2E6F89
Indigo       #404780
Iris         #574887  // also the brand primary
Plum         #7A3B6E
Rose         #94405E
Crimson      #9E343C
Terracotta   #9E4E37
Amber        #A86C29
Marigold     #A88820
Olive        #6F7032
Graphite     #404040
Storm        #5A636F
```

Rules:

- Background: `parchment-100`. Raised cards: `parchment-50` with a faint shadow. Inset fields and chips: `parchment-200`.
- Text: ink scale (900 for headings, 700 body, 500 secondary, 300 hints).
- Only one brand colour (iris). Use it for the main action, the active nav item, the Bloom centre, and the focus ring.
- Rose is for genuinely below-target states like "this area has been silent for two weeks". Never for "you missed yesterday".

### 4.2 Typography

- **Display serif** for headings, big numbers, and moments of personality: *DM Serif Display*. Used for page titles, the Bloom centre mark, empty-state headlines, the "why" mantra at the top of the habit detail view.
- **Humanist sans** for everything else: *Plus Jakarta Sans*, weights 400 / 500 / 600.

Roles: serif `text-2xl` and up for titles and key figures; sans `text-sm` and `text-xs` for UI; uppercase tracked micro-labels (`text-[10px]` letter-spacing 0.1em) for section eyebrows.

Load via `<link>` in `index.html` from Google Fonts.

### 4.3 Watercolour wash (the signature)

This is the one element that makes Harmony unmistakable. Implement it as a reusable component:

```tsx
// components/WatercolorWash/WatercolorWash.tsx
// Bleeds the given hex colour from the bottom of its container upward.
// Use it inside relatively-positioned containers (screens, cards).
// Opacity ramps from ~0.18 at the bottom to 0 by the top of the wash band.
//
// Implementation: a single absolutely-positioned div with a vertical
// linear-gradient. Three stops: bottom 0.18, mid 0.06, top 0.
//
// Props: color (hex), height (number, defaults to 480), className.
```

Use it in three places:

1. **Onboarding "why" capture screens.** Wash in the area's colour over the lower half of the screen.
2. **The nested habit detail view.** Wash in the area's colour fading downward from the top of the screen (inverted, so it sits behind the mantra and crown of the header).
3. **The compose-habit bottom sheet** when an area is selected, in that area's colour.

Do not wash the home screen or list screens. The Bloom carries the colour on home, and lists need calm neutral surfaces.

### 4.4 Shape, depth, and surfaces

- Radii: cards `12px`, sheets and large surfaces `16px`, FAB `24px`. Pills fully rounded.
- Shadows: faint `shadow-sm` for cards, a softer wide shadow for sheets and the FAB. Never harsh dark drop shadows.
- Rings over borders: inputs use `ring-1 ring-inset ring-parchment-300`, thickening and turning iris on focus. No 1px borders on form controls.
- Selected swatch halo: `box-shadow: 0 0 0 2px <bg>, 0 0 0 4px <swatch>`.

### 4.5 Motion tokens

```ts
// lib/motion.ts
export const spring = { type: 'spring', stiffness: 400, damping: 30 };
export const softSpring = { type: 'spring', stiffness: 120, damping: 20 };
export const listContainer = { animate: { transition: { staggerChildren: 0.05 } } };
export const listItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: spring },
};
```

Patterns: `whileTap={{ scale: 0.97 }}` on buttons, `0.9` on icon chips. Lists stagger in. Sheets and modals spring up via `AnimatePresence`. The Bloom's petals animate fill on first paint and on every log via `useSpring`. Keep durations 0.2 to 0.4s. Respect `prefers-reduced-motion`.

---

## 5. Native-feel layer (mandatory, do not skip)

This is what makes the PWA feel like a real iOS app. Copy the CSS verbatim.

### 5.1 Sizing the shell to the real visible viewport

```css
/* styles/native-feel.css */
html {
  height: min(calc(100dvh + env(safe-area-inset-top)), 100lvh);
}
body { height: 100%; overflow: hidden; overscroll-behavior: none; }
#root { height: 100%; overflow: hidden; }
```

The app shell is a flex column (or row at `md+`) at this height. Only an inner region scrolls. The top safe-area inset lives on the content wrapper, outside the scroller, so content never slides under the status bar. The bottom nav is a normal flex child, not `position: fixed`, so it stays flush to the true bottom in any orientation.

### 5.2 Safe area variables

```css
:root {
  --safe-top: env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-left: env(safe-area-inset-left);
  --safe-right: env(safe-area-inset-right);
}
```

Tailwind utilities `pt-safe`, `pb-safe`, `pl-safe`, `pr-safe` map to these. Set the viewport meta to `viewport-fit=cover` in `index.html`.

### 5.3 Momentum scrolling

```css
.scroll-ios {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}
```

Apply to the single inner scroller.

### 5.4 Bottom sheets

- Render via a **portal to `document.body`** so they escape any stacking context.
- Pin to the bottom, cap height at `max-h-[90%]`.
- Read `window.visualViewport` and update a `--keyboard-height` CSS variable. Sheets lift above the keyboard by that amount.
- The grip handle is the only draggable element; drag controls are off on the panel body so users can scroll its content freely.

### 5.5 Floating action button

```
fixed bottom-[calc(5rem+var(--safe-bottom))] right-5 md:bottom-8 md:right-8
```

---

## 6. Data model

### 6.1 Dexie schema

```ts
// lib/db/schema.ts
import Dexie, { Table } from 'dexie';

export interface UserProfile {
  id: string;                 // matches Supabase auth user id
  firstName: string;
  onboardedAt: number | null;
  pushSubscriptionId?: string;
  timezone: string;
}

export interface Area {
  id: string;
  userId: string;
  name: string;               // user-named, e.g. "Creativity"
  color: string;              // hex, picked from the area palette
  importance: 'core' | 'matters' | 'optional';  // shown in UI as: "really matters", "matters", "nice to have"
  whySentence: string;        // the user's own words. The single most valuable field in the app.
  order: number;              // 0-based, drives the master priority order
  createdAt: number;
  archivedAt: number | null;
}

export interface Habit {
  id: string;
  userId: string;
  areaId: string;
  name: string;
  // Frequency model:
  cadence:
    | { kind: 'daily' }
    | { kind: 'weekdays' }          // Mon-Fri
    | { kind: 'weekends' }
    | { kind: 'specific-days'; days: number[] }  // 0=Sun..6=Sat
    | { kind: 'times-per-week'; times: number }
    | { kind: 'every-n-days'; n: number };
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'anytime';
  reminderTime: string | null;  // "HH:mm" local, or null if no reminder
  startDate: string;            // ISO date
  endDate: string | null;       // ISO date or null (indefinite)
  order: number;
  createdAt: number;
  archivedAt: number | null;
}

export interface Log {
  id: string;
  userId: string;
  habitId: string;
  areaId: string;               // denormalised for fast area-level queries
  date: string;                 // ISO date (the day it was tended)
  loggedAt: number;             // epoch ms when the user actually tapped
  note: string | null;          // optional: "how did that feel?"
}

export interface NudgeHistory {
  id: string;
  userId: string;
  templateId: string;
  areaId: string | null;
  habitId: string | null;
  composedText: string;
  sentAt: number;
  channel: 'push' | 'in-app';
}

export interface Setting {
  key: string;
  value: any;
}

export class HarmonyDB extends Dexie {
  profile!: Table<UserProfile, string>;
  areas!: Table<Area, string>;
  habits!: Table<Habit, string>;
  logs!: Table<Log, string>;
  nudgeHistory!: Table<NudgeHistory, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('harmony');
    this.version(1).stores({
      profile: 'id',
      areas: 'id, userId, order, archivedAt',
      habits: 'id, userId, areaId, order, archivedAt',
      logs: 'id, userId, habitId, areaId, date, loggedAt',
      nudgeHistory: 'id, userId, templateId, areaId, sentAt',
      settings: 'key',
    });
  }
}

export const db = new HarmonyDB();
```

### 6.2 Supabase schema

Mirror the Dexie tables. Use Row Level Security so each user only sees their rows. Background sync runs after every write and on app focus. Treat Dexie as source of truth on-device; Supabase reconciles in the background. Conflicts: last-write-wins per row.

The Cloudflare Worker reads `nudgeHistory` and `push_subscriptions` from Supabase directly (service role key in Worker env) when running cron drift checks. This avoids a separate sync.

### 6.3 Push subscriptions table (Supabase)

```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

create index on push_subscriptions(user_id);
create unique index on push_subscriptions(endpoint);
```

---

## 7. Authentication

Supabase email and password. Use Supabase's built-in auth, do not roll your own.

- Sign up screen: email, password (min 8 chars), first name. On submit, create Supabase user, create `UserProfile` locally and in Supabase.
- Sign in screen: email, password. Auth gate routes to onboarding if `onboardedAt` is null, otherwise to home.
- Password reset via Supabase magic link is fine for v1.
- No social logins in v1.
- Sign out from settings.

The auth screens follow the same visual language as the rest of the app: parchment background, ink text, iris primary button. No splash imagery. The headline is a quiet sentence in DM Serif Display.

---

## 8. Onboarding flow

Five real screens plus an install nudge. Each screen lives in `screens/onboarding/`. Progress dots at the top of each (1 dot filled per completed screen).

### Screen 1 — Welcome

Serif headline: "Habits, but quieter."
Sub: "We help you tend to the parts of life that make you feel like yourself. Nothing to win. Nothing to lose."
Primary: "Begin".
This is the only screen where copy is allowed to lean a little poetic. Everywhere else, restrain.

### Screen 2 — Pick your areas of life

Headline: "What parts of life make you feel most yourself?"
Sub: "Pick three to seven. You can change these any time."

Show a soft grid of suggested areas as tappable chips, each with a small dot in its colour:

> Body, Mind, Creativity, Connection, Play, Spirit, Home, Work, Learning, Rest, Service, Place

Plus an "Add your own" chip that opens a small modal for a custom name and colour swatch picker.

Selected chips invert (chip fills with its colour at ~12% opacity, text in the same colour's 700 stop). Continue is dim until at least three are selected.

### Screen 3 — In your own words

This is the most important screen in the product. Iterate through each area the user picked (so this screen appears N times). For each, the screen washes in that area's colour from the bottom and asks:

Headline (DM Serif Display): "A good week of {areaName}, in your own words."
Sub: "A short sentence is enough. We bring this back to you in reminders."
Textarea with placeholder "Write here." and a "Need a starting point?" link that, when tapped, swaps in one of three example sentences from other (anonymised) users for the textarea to use as inspiration. Do not put words in the user's mouth by default.

Below the textarea, a live preview block (`A reminder might read`) showing how a real drift nudge would use their sentence. Updates as they type. This shows them, not tells them, what the app does with their words.

Continue stays dim until at least 10 characters are typed. Allow skipping with a small "Skip for now" link, but warn that "Without this, reminders feel less like you."

### Screen 4 — Which areas matter most?

Three-tier sort. Drag chips between buckets:

- **Really matters** (drift detection is most attentive here)
- **Matters** (drift detection is gentle here)
- **Nice to have** (no drift nudges, only scheduled reminders)

Default: everything in "Matters". User drags to other buckets.

Copy: "These don't have to be in stone. Tweak any time."

### Screen 5 — One habit per area

For each area, prompt for ONE starter habit. Not three. Not five. One.

"What's one small thing you'd like to do for your {areaName}?"

Inputs:
- Habit name (free text)
- Frequency (default: 3 times a week)
- Time of day (default: anytime)

A "Skip this area for now" link is available. The user can add more habits later.

### Screen 6 — Add Harmony to your home screen

Detect iOS Safari, Android Chrome, and desktop browsers. Show platform-specific instructions:

- **iOS Safari**: "Tap the share icon, then 'Add to Home Screen'. Notifications only work this way on iPhone, by Apple's design."
- **Android**: trigger `beforeinstallprompt` event capture and show a native install prompt.
- **Desktop**: similar install prompt.

Make this skippable. Mark `onboardedAt` and proceed to Home.

After onboarding, the Bloom on Home should already be partially filled because the user has just defined real areas and habits. Even before any logging, show the "rest state" of the Bloom: very low fill on all petals, ready to grow.

---

## 9. Home view

The Bloom, today's habits, and (when relevant) a drift nudge banner. This is where the user spends most of their time.

### 9.1 Layout

```
[ Status bar / safe-top ]

Sunday, June 28
Good morning, [firstName].

[ Drift nudge banner, only if a drift condition fires today ]

         [ THE BLOOM ]
         "In a good rhythm today" / "A few areas waiting for you" / "Tend to yourself today"

[ Area chips: horizontal scroll, one per area ]

TODAY                                        3 of 5 tended
[ Habit card 1 ]
[ Habit card 2 ]
[ Habit card 3 ]
...

[ Bottom nav: Home / Areas / Log / Insights / Me ]
```

### 9.2 The Bloom component

`components/Bloom/Bloom.tsx`

- SVG, 220x220 by default, responsive.
- One petal per area, evenly distributed around the circle.
- Each petal is an arc segment between min radius (`r=22`) and max radius (`r=80`).
- Petal fill height = `min radius + (max - min) * activity` where `activity ∈ [0, 1]`.
- Activity is computed as: rolling 14-day completion ratio for habits in that area, normalised so a typical-cadence area sits around 0.7.
- Petal track (the unfilled background) is the area's colour at 13% opacity.
- Petal fill is the area's colour at 87% opacity.
- Two faint dashed concentric rings at 33% and 66% radius act as scale references.
- Centre: a small parchment-50 circle with the lowercase "h" in DM Serif Display, iris-500.
- On first paint, petals animate from `r = minRadius` to their value via `useSpring` (the `softSpring` token).
- Tapping a petal navigates to that area's screen.
- Long-press shows a tooltip with the area name and the user's "why" sentence.

The Bloom is the hero. Nothing else on the home screen competes for attention with it.

### 9.3 Drift nudge banner

A soft horizontal banner above the Bloom, only visible when the drift engine has fired today. Background: `area.color` at 12% opacity. Left border: 3px in `area.color`. Inside, the composed nudge text.

Tapping it goes to that area's screen.

### 9.4 Today's habits

One card per habit due today (based on cadence). Each card:

- 3px left border in the area's colour.
- Round check on the left (22px). Empty = inset ring; done = filled in area colour with a tiny white check.
- Habit name (ink-900 if pending, ink-300 with strikethrough if done).
- Area name in the area's colour (text-xs).
- Time of day on the right (ink-300).

Tapping the check toggles the log. Optimistic: the check fills, the count updates, and the Bloom petal redraws immediately. Server sync happens in the background.

Tapping anywhere else on the card opens the nested habit view.

### 9.5 Logging is cheap

Tap-to-log is one touch. There is never a confirmation modal for logging. Long-press a habit card to add a note ("how did that feel?") in a small bottom sheet.

---

## 10. Areas view

A vertical list of areas in priority order, with drag handles to reorder. Each row:

- Colour swatch (8px circle).
- Area name (sans 16px, ink-900).
- Tiny line below: "{N} habits, {M} tended this week" in ink-500.
- A 14-day mini sparkline of activity in the area's colour (sparkline is just 14 vertical dots, filled or dim).
- Chevron right.

FAB: "Add area".

Long-press to edit an area opens a bottom sheet with: name, colour swatch picker, importance tier, the "why" sentence (editable), and an archive button.

---

## 11. Nested habit detail view (one of the two most important screens)

When the user taps a habit card, this is what opens.

### 11.1 Layout

```
[ Watercolour wash header (in area's colour, fades downward) ]
[ Back arrow                                      Edit icon ]
[ Area chip: "Creativity" ]
[ Habit name in DM Serif Display, big ]

[ Mantra block, set apart by extra vertical space ]
"Making one small thing each week, even if it's bad."
                                          — your words

[ 28-day soft-dot heatmap, 4 rows of 7 ]
                                       Last tended Thursday evening.

[ Pattern observations, only when a pattern is real ]
"You tend to do this on weekend mornings."
"You've logged this most often after your morning run."

[ Note thread ]
A reverse-chronological list of past logs that had notes attached.
Each is a tiny card: date and the note text.

[ Neighbours in Creativity ]
A horizontal scroll of the other habits in this area, each as a small chip
with a dot showing recent activity. Tap to navigate.

[ Edit / Archive sheet trigger at bottom ]
```

### 11.2 Soft-dot heatmap

28 days, 4 rows of 7. Each dot is 14px:

- Tended that day: filled in the area's colour, 87% opacity.
- Not tended, habit was scheduled: filled in `parchment-300` (visible but quiet).
- Not tended, habit was not scheduled: filled in `parchment-200` (almost invisible).
- Today: thin iris ring around the dot.

Never red. Never empty hollow circles (those read as "missing").

Hovering or tapping a dot shows the date and, if there was a note, a tooltip with the note.

### 11.3 Pattern observations

Rules-based. The drift engine computes these and surfaces only those above a confidence threshold:

- Day-of-week pattern: if >60% of completions in the last 60 days fall on the same 2-3 days of the week.
- Time-of-day pattern: same logic on time-of-day-of-log.
- Adjacency pattern: "after [habit]" if there's a high co-occurrence with another habit on the same day.
- Streak-of-presence (not absence): "You've shown up for this in 4 of the last 7 weeks". Never "you missed".

If no patterns clear the threshold, this section is hidden entirely. Don't fill space.

### 11.4 Mantra block

The area's `whySentence`, quoted, in DM Serif Display, italic. Centered. The attribution line "— your words" sits below in ink-300.

This is the part of the screen that does the emotional work. Don't crowd it.

---

## 12. Log view

A month-view calendar where each day shows a tiny stack of coloured dots, one per area that had any activity that day. Tap a day to open a small bottom sheet listing what was logged that day, with notes.

Above the calendar, a horizontal "this week" strip with the last 7 days as soft-dots, total tended count.

No "longest streak" anywhere. No graphs of consistency that make the user feel watched. The page is a quiet record, not a report card.

---

## 13. Insights view

A single scrollable page. Rules-based, no LLM.

### 13.1 The weekly recap

Composed every Sunday at the user's local 6am via the Cloudflare cron, and shown in-app on next open. Five sentences max, each one drawn from a template library that pulls real numbers, the user's area names, and their why-sentences.

Example composed recap:

> Your Body had a strong week. You tended to running three times.
> Connection was steady. You called your mother on Sunday.
> Creativity has been quiet for nine days. You wrote: "Making one small thing each week, even if it's bad."
> Nice to have areas can wait. Play and Rest are okay where they are.
> Sunday's a fresh week. No need to catch up.

This must read as if a calm person wrote it. The trick is that every noun in the recap is either the user's own word or a fact about them. The connective tissue is the template library.

### 13.2 Area balance

A horizontal bar for each area showing the rolling 30-day completion ratio, in that area's colour. No percentage labels. Just bars. A subtle iris vertical line marks where a "typical" rhythm would sit.

### 13.3 Gentle observations

Up to three of these per page, surfaced only when rules trigger:

- "You've added 4 logs to Body this week, your most in a month."
- "Wednesday evenings are your most consistent time for Reading."
- "Connection has been quieter than usual. You wrote: '...'."

### 13.4 What to do next

Up to two suggestions, also rules-based:

- "Want to add a small Creativity habit? You've said it matters to you." (If a "core" area has no habits or only one.)
- "Wednesday is your strongest day. Maybe move a habit there?" (If completion is highly clustered on one day.)

Suggestions are CTAs to specific in-app actions, never just advice.

---

## 14. Settings (Me)

- Account: email, sign out, delete account (confirmation modal that states what will be lost).
- Priority order: a drag-reorderable list of areas, identical to the Areas view list, but with the "really matters / matters / nice to have" tier shown as a chip.
- Per-area: edit name, colour, importance, why-sentence, drift sensitivity (Low / Default / High), reminder time-of-day.
- Notifications: master toggle, per-area enable, do-not-disturb time window (default 9pm-7am local).
- What's new: a friendly in-app changelog. Latest expanded, older collapsed.
- About: app version, link to terms / privacy.

---

## 15. The template engine (the heart of "rules-based but dynamic")

`lib/templates/library.ts` exports an array of `Template` objects.

```ts
// packages/shared/src/templateTypes.ts
export type TemplateType =
  | 'drift'                  // an area has gone quiet
  | 'time-of-day-reminder'   // scheduled reminder for a habit
  | 'celebration'            // in-app toast after logging
  | 'weekly-recap-sentence'  // building blocks for the Sunday recap
  | 'morning-greeting'       // the small line under the Bloom
  | 'install-nudge';         // gentle prompt to add to home screen

export interface Template {
  id: string;
  type: TemplateType;
  weight?: number;             // bias selection
  conditions?: TemplateCondition[];
  body: string;                // contains {placeholders}
}

export interface TemplateCondition {
  // any of these may be set; all set conditions must match
  timeOfDay?: ('morning' | 'afternoon' | 'evening' | 'night')[];
  dayOfWeek?: number[];        // 0-6
  weather?: ('sunny' | 'rainy' | 'cold' | 'hot')[];
  minDaysSince?: number;
  maxDaysSince?: number;
  importance?: ('core' | 'matters' | 'optional')[];
}
```

Placeholders:

```
{whySentence}      area.whySentence verbatim
{areaName}         area.name
{habitName}        habit.name
{firstName}        profile.firstName
{daysSince}        integer days since last log in this area
{lastDayPhrase}    "Thursday" or "last Tuesday" or "9 days ago"
{timeOfDay}        "this morning" | "tonight" | "today"
{weatherPhrase}    "the sun's finally out" | "" (often empty)
```

### 15.1 Example drift templates (write 12 to 15)

```
"You wrote: \"{whySentence}\" It's been {daysSince} days. Maybe {timeOfDay}."
"{areaName} has been quiet for {daysSince} days. Your words from then: \"{whySentence}\""
"{daysSince} days since you tended to {areaName}. You said: \"{whySentence}\""
"Remember writing \"{whySentence}\"? {timeOfDay.titleCase} could be the night."
"A small return to {areaName}, {firstName}? It's been {daysSince} days. You wrote: \"{whySentence}\""
"You haven't been to {areaName} since {lastDayPhrase}. \"{whySentence}\" was the reason you gave."
"{weatherPhrase} {areaName} has been waiting {daysSince} days. \"{whySentence}\""
"Quietly, {areaName} has been on pause for {daysSince} days. \"{whySentence}\""
"It's been almost a fortnight in {areaName}. Your words: \"{whySentence}\""
"{firstName}, you wrote \"{whySentence}\". It's been {daysSince} days. Even ten minutes counts."
"{areaName} called. \"{whySentence}\" was what you said about it."
"Eight days. Nine. {daysSince}. {areaName} is patient, but it's there. \"{whySentence}\""
```

Pick the template by:

1. Filter by `type` and matching `conditions`.
2. Filter out any template `id` used for this `{areaId, type}` pair in the last 14 days (via `nudgeHistory`).
3. Weighted random among remaining.
4. Substitute placeholders.
5. Insert a record into `nudgeHistory`.

### 15.2 Composer (`lib/templates/composer.ts`)

```ts
export function compose(input: {
  type: TemplateType;
  area?: Area;
  habit?: Habit;
  context: {
    now: Date;
    weather?: WeatherSummary | null;
    daysSinceLastLog?: number;
    profile: UserProfile;
  };
}): Promise<{ templateId: string; text: string } | null>;
```

The composer is pure: same inputs in, same output out (modulo the random pick which is seeded with `Date.now()` for variation but tracked so we don't repeat).

The composer is used in **two places**:

- **Frontend** (in `useEffect` on Home open) for in-app banner and morning greeting.
- **Cloudflare Worker** for push notifications. Mirror this file into the Worker package so the Worker can compose the same way.

Keep the libraries and composer logic byte-identical between web and worker. Write a tiny shared package or copy the files with a build step.

---

## 16. Drift detection (`lib/drift/detect.ts`)

A pure function that decides, given a user's data right now, which areas (if any) should fire a drift nudge.

Algorithm (run client-side on every app open, and server-side every 15 minutes via cron):

```
For each area where importance != 'optional' and area is not archived:
  cadence = median days between completed logs in this area over last 60 days
            (clamped to a sensible range, e.g. 1 to 14)
  if cadence is undefined (new area, no history):
    cadence = derived from the median habit cadence in this area
              (e.g. "times-per-week:3" => cadence ~2.3 days)

  daysSinceLast = days since the most recent log in this area
                  (if no log ever, treat as days since the area was created)

  threshold =
    importance == 'core'   ? max(cadence * 1.5, 5)
    importance == 'matters'? max(cadence * 2.0, 10)

  if daysSinceLast > threshold AND no drift nudge for this area in last 3 days:
    enqueue a drift nudge for this area
```

The Cloudflare Worker cron runs this for all users. For each enqueued nudge, it calls the composer and sends a push to that user's subscription(s). It writes to `nudgeHistory` so the next pass knows.

Anti-spam invariants:

- Never more than one drift nudge per area per 3 days.
- Never more than two drift nudges per user per day, even across areas.
- Honour `do-not-disturb` window from settings.
- Honour per-area `notifications: enabled` setting.
- Honour the global notifications master toggle.

---

## 17. Push notifications (on-device only)

End to end:

### 17.1 Frontend: permission and subscription

`lib/push/subscribe.ts`

- After onboarding completes, prompt for notification permission with a gentle one-screen explainer: "Notifications are how we bring your words back to you. Sound, banner, lock screen — like any other app."
- If granted, register the service worker (if not already), call `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <VAPID_PUBLIC> })`, and POST the subscription to the Cloudflare Worker. The Worker writes it into Supabase.
- Detect iOS Safari and require home-screen installation first. If `window.matchMedia('(display-mode: standalone)').matches` is false on iOS, show the install instructions screen and skip subscription until they return as standalone.

### 17.2 Service worker (`sw.ts`)

```ts
// Workbox precaching from vite-plugin-pwa, plus:

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const { title, body, areaId, url } = data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge.png',
      tag: areaId ? `area-${areaId}` : undefined,  // coalesce per-area nudges
      data: { url, areaId },
      vibrate: [40, 30, 40],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => 'focus' in c);
        if (existing) return existing.focus();
        return self.clients.openWindow(url);
      })
  );
});
```

Also wire up `controllerchange` -> show "Updating..." overlay -> reload, for seamless service worker updates.

### 17.3 Cloudflare Worker (`apps/push-worker`)

`wrangler.toml` declares:
- A D1 binding (or skip D1 and read/write Supabase directly via REST with the service role key; D1 is optional, used for caching subscriptions to reduce Supabase reads).
- A KV binding for cron-state (optional).
- A scheduled trigger: `cron = "*/15 * * * *"`.
- Secrets: `VAPID_PUBLIC`, `VAPID_PRIVATE`, `VAPID_SUBJECT` (`mailto:you@example.com`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

`src/index.ts`:

- HTTP route `POST /subscribe` accepts a subscription JSON and writes it to Supabase via REST.
- HTTP route `DELETE /subscribe` removes by endpoint.
- `scheduled` handler runs every 15 minutes:
  1. Read all active users from Supabase.
  2. For each user, fetch their areas, habits, logs, settings, nudgeHistory.
  3. Run the drift detection function (mirrored from frontend).
  4. For each enqueued nudge, call the composer (mirrored from frontend) to get `{ templateId, text }`.
  5. For each of the user's push subscriptions, call `webpush.sendNotification(subscription, payload)`.
  6. Write a `nudgeHistory` record.
  7. Catch 410 / 404 from web-push as "subscription expired", and delete the subscription.

The Worker also handles a `POST /test-push` route (auth-gated by a header) for development. Use this to test on a real device before wiring up the cron.

### 17.4 D1 schema (`schema.sql`)

```sql
create table sent_nudges (
  id text primary key,            -- nudge history id, matches Supabase row
  user_id text not null,
  area_id text,
  template_id text not null,
  sent_at integer not null,
  unique(user_id, area_id, sent_at)
);

create index idx_sent_nudges_user on sent_nudges(user_id, sent_at);
```

This is just a local cache to avoid hammering Supabase. Source of truth stays in Supabase.

### 17.5 iOS specifics

- iOS only delivers web push when the PWA is installed to the home screen, since iOS 16.4.
- The install prompt in onboarding must be clear about this. After install, ask the user to reopen the app from the home screen and the subscription flow will start.
- Test on a real iPhone before declaring this done.

---

## 18. PWA manifest and service worker

`public/manifest.webmanifest`:

```json
{
  "name": "Harmony",
  "short_name": "Harmony",
  "description": "Habits that help you return to yourself.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#FAF9F6",
  "theme_color": "#FAF9F6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

Icons: a soft iris-on-parchment "h" mark in DM Serif Display, with the maskable safe area respected. Provide both `192` and `512` and `1024` for iOS.

`vite-plugin-pwa` setup:

- `registerType: 'autoUpdate'`.
- `srcDir: 'src'`, `filename: 'sw.ts'`, `strategies: 'injectManifest'` so we can write custom push handlers in `sw.ts`.
- Precache the app shell.
- On `controllerchange`, show an "Updating Harmony" overlay (parchment background, iris loader dot) for ~700ms, then reload.

---

## 19. Build phases (do these in order)

Each phase is a discrete unit of work. After each, hand the build back for review.

**Phase 1. Scaffold.** Create the monorepo, install deps, set up `tailwind.config.ts`, `vite.config.ts`, the token CSS and native-feel CSS, the app shell with sidebar/bottom-nav. Stub all five top-level screens. Make sure `npm run dev` shows a blank shell that looks like the design system at rest.

**Phase 2. Auth.** Supabase email/password sign-up and sign-in. Auth gate. Profile created in Supabase and Dexie. Sign out.

**Phase 3. Onboarding.** All six onboarding screens, real data persistence to Dexie and Supabase. The "why" capture screen with watercolour wash and live preview. Pay attention to the wash component reuse.

**Phase 4. Home and the Bloom.** Bloom SVG component with animated petals. Today's habits list. Tap-to-log. Optimistic updates with Bloom redraw. No drift banner yet.

**Phase 5. Areas, habits, edit flows.** Areas view with reorder. Habit creation/edit bottom sheets. Area creation/edit bottom sheets. The FAB.

**Phase 6. Nested habit detail.** Watercolour wash header. Mantra block. Soft-dot heatmap. Note-on-log. Neighbours strip. Pattern observations stubbed to return nothing yet.

**Phase 7. Template engine and drift detection.** `lib/templates/library.ts` with at least 12 drift templates plus a handful of other types. `lib/templates/composer.ts`. `lib/drift/detect.ts`. Surface drift on the home banner. Pattern observations in habit detail.

**Phase 8. Log and Insights.** Monthly calendar with dot stacks. Weekly recap composer. Area balance bars. Gentle observations. "What to do next" suggestions.

**Phase 9. Settings.** Account, priority reorder, per-area edit, notifications preferences, do-not-disturb, what's new.

**Phase 10. PWA + push.** Manifest, icons, service worker, install detection, install instructions screen, subscription flow.

**Phase 11. The Cloudflare Worker.** Set up `apps/push-worker`, write the `scheduled` handler, mirror the templates and drift code, deploy to Cloudflare. Test push delivery on a real device.

**Phase 12. Polish.** Empty states. Skeletons. Sync dot. Reduced motion. A11y. Lighthouse pass. Bug bash on iOS Safari (real device), Android Chrome, desktop.

---

## 20. Quality bar

- **Responsive down to 320px wide.** No horizontal scroll anywhere except where it's the design intent (area chip row, neighbours strip).
- **Visible keyboard focus.** Iris focus ring on every interactive element.
- **Reduced motion respected.** When `prefers-reduced-motion: reduce`, springs become instant, but no functional motion is removed.
- **Lighthouse PWA score 100.** Performance > 90 on mid-tier mobile.
- **Lighthouse Best Practices and Accessibility > 95.**
- **First contentful paint < 1.5s** on the home screen on a throttled 3G simulation.
- **Optimistic everywhere.** Every user-initiated mutation reflects on screen before any network round-trip.
- **Sync dot, not spinners.** A small dot in the corner shows offline / pending / synced. Full-screen loaders only for first auth.
- **All copy follows the voice rules above.** No em dashes. No "successfully". No exclamation marks on system copy.

---

## 21. Things that are explicitly out of scope for v1

- Social features (sharing, friends, group habits).
- Apple Watch or wearable companions.
- Native iOS/Android apps (the PWA is the product).
- AI-generated content (no Claude API, no OpenAI). The template engine is the dynamism.
- Email notifications.
- Streaks. Plant pets. Score systems.
- Multiple themes / dark mode. (Dark mode can come later; v1 is parchment only.)
- Localisation. (English only for v1, but copy is structured so localisation could come later.)

---

## 22. Reference materials embedded in this spec

This document is intentionally self-contained. The native-feel CSS in section 5, the token table in section 4, the schemas in section 6, the algorithm in section 16, and the templates in section 15 are all you need to build the foundations. Iterate from there.

Build in the order listed. After every phase, stop and check against the screens described above. Don't sprint past the foundations; the watercolour wash, the Bloom, and the template engine are the three pieces that make this app what it is. Get them right and the rest follows.
