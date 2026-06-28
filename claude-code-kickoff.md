# Claude Code kick-off prompt

Paste the message below into Claude Code at the start of your **first** session, along with the attached `harmony-claude-code-spec.md`. Subsequent sessions can be shorter (see the bottom of this file for a template).

---

## First session

> You're building Harmony, a habit-tracking PWA. The full specification is in the attached `harmony-claude-code-spec.md`. Read it end to end before writing a line of code. The decisions in that file are locked: stack, palette, naming, voice rules, data model, and the build phases are not up for debate. Push back only if you find a genuine contradiction or a technical blocker.
>
> Two rules from that spec deserve repeating because they're easy to forget:
>
> 1. No em dashes or en dashes in any code, copy, comment, or commit message. Use commas, periods, colons, or parentheses. This is part of the aesthetic.
> 2. The user's own onboarding sentences appear verbatim wherever they're surfaced. Never paraphrase the user.
>
> **In this session, do Phase 1 only.** That means: scaffold the monorepo per section 3 of the spec, install the locked dependencies from section 2, set up `tailwind.config.ts` with the exact tokens from section 4.1, create `styles/tokens.css` and `styles/native-feel.css` with the CSS from sections 4 and 5 verbatim, build the app shell with the `md+` sidebar and phone bottom tab bar, and stub the five top-level screens (Home, Areas, Log, Insights, Me) as placeholder components.
>
> Do not start onboarding. Do not start auth. Do not start the Bloom. Do not start the watercolour wash component (it lives in Phase 3). Do not write any database code beyond the Dexie schema file. The goal of this session is that `pnpm --filter @harmony/web dev` opens a blank shell that looks like the design system at rest: parchment background, ink text, iris-coloured active nav item, real safe-area handling on mobile, the sidebar visible at desktop widths.
>
> When you're done, give me three things: a one-paragraph summary of what was built and how to run it, a list of any small judgement calls you made that aren't covered by the spec, and the exact next phase you'd recommend tackling and why. Then stop. Don't roll into Phase 2 without being asked.
>
> If the spec is ambiguous on anything, default to the calmer, more restrained interpretation. If you're tempted to add a feature that isn't in the spec, don't.

---

## Subsequent sessions (template)

Use this shorter version for Phase 2 onward. Replace `{N}` and the focus list:

> We're continuing Harmony, the habit-tracking PWA. The full specification is in `harmony-claude-code-spec.md`. The locked decisions still stand: no em dashes, the user's own words always come back unchanged, the stack and palette do not move.
>
> In this session, do Phase {N} only: {one-line summary of what that phase covers, e.g. "the onboarding flow, with watercolour wash on the why-capture screens and live-preview composition"}. Do not touch later phases. If a later phase would be easier to do alongside, tell me and wait.
>
> When you're done: one-paragraph summary, judgement calls made, recommended next phase. Then stop.

---

## A note on model choice mid-build

If you're using Sonnet 4.6 for routine phases and something doesn't feel right (the wash treatment looks wrong, the Bloom animation stutters, a nudge reads cold) swap to Opus 4.8 for the fix and then swap back. Don't burn a whole session of Opus on cleanup work, but don't try to grind through a wrong-feeling result with Sonnet either.
