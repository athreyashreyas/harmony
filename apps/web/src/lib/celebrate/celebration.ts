// Deciding when a Bloom section earns a confetti celebration. Pure logic, kept
// apart from the DOM (confetti.ts) and React (useCelebrations.ts) so it can be
// reasoned about and unit-tested on its own.

// A petal counts as "in full bloom" at essentially 1. We allow a hair below to
// absorb floating-point drift from the gamma curve in computeAreaActivity (a
// core area is pow(score, 1.35), which can land at 0.9999… even when full).
export const BLOOM_THRESHOLD = 0.999;

// After celebrating a section, stay quiet about it for a while. A steady daily
// streak keeps it full, so we honour that once, not every day; and a brief slip
// then quick recovery isn't a fresh achievement. About a week feels like enough
// of a gap that re-earning full bloom deserves the confetti again.
export const CELEBRATION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// The last time each section set off confetti (area id -> epoch ms). Persisted
// per account so the "don't spam successive days" rule survives app reloads.
export type CelebrationRecord = Record<string, number>;

export function isMaxed(activity: number): boolean {
  return activity >= BLOOM_THRESHOLD;
}

// The whole Bloom in full bloom: every section is full at once (and there's more
// than one, so a lone section maxing isn't "the whole life"). Deliberately
// strict — an area with no tend habits reads as 0 and blocks it — so we only
// ever declare a whole-Bloom moment when the entire wheel is genuinely full,
// never falsely because an empty area was quietly ignored.
export function isWholeBloom(current: Map<string, number>): boolean {
  return current.size > 1 && [...current.values()].every(isMaxed);
}

// Decide which sections deserve a fresh celebration this tick, and the updated
// record to persist. Pure: the only clock it reads is the `now` passed in.
//
// A section celebrates when it *crosses* into full bloom (was below just before,
// full now) and it hasn't celebrated within the cooldown. Crossing is the crux:
//   - A section already full when the screen loaded never "crossed", so opening
//     the app on a maxed bloom stays calm, and a consistent streak — full every
//     day — fires once (the day it first filled), not each successive day.
//   - Only after a section drops out of full bloom and is re-earned does it
//     cross again; the cooldown then gates that so a one-day dip-and-recover
//     doesn't re-fire, but a real lapse of about a week does.
// Each section is judged on its own id, so maxing one area never suppresses the
// celebration for a different one.
export function decideCelebrations(args: {
  prev: Map<string, number>;
  current: Map<string, number>;
  records: CelebrationRecord;
  now: number;
  cooldownMs?: number;
}): { celebrate: string[]; records: CelebrationRecord } {
  const { prev, current, records, now, cooldownMs = CELEBRATION_COOLDOWN_MS } = args;
  const celebrate: string[] = [];
  let next = records;

  for (const [areaId, activity] of current) {
    if (!isMaxed(activity)) continue;

    // A real crossing needs a known below-full value just before. `undefined`
    // means first sight this session (e.g. a cold load), which is never a
    // crossing — so an already-full section on open doesn't fire.
    const before = prev.get(areaId);
    if (before === undefined || isMaxed(before)) continue;

    const last = records[areaId];
    if (last !== undefined && now - last < cooldownMs) continue;

    celebrate.push(areaId);
    if (next === records) next = { ...records };
    next[areaId] = now;
  }

  return { celebrate, records: next };
}
