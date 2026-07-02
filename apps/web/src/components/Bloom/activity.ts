import type { Area, Habit, Log } from '@harmony/shared';
import { expectedCompletionsInWindow } from '../../lib/time/cadence';
import { isoDaysAgo, todayISO } from '../../lib/time/dates';

// How much each logged tug eats off the petal, per "equivalent missed session",
// and the most tugs can ever take. Honest but never punitive.
const TUG_UNIT = 0.12;
const TUG_CAP = 0.6;

// Tier one: how readily a petal fills, by the area's importance. A lower-stakes
// area looks healthy with less, so the user's attention is drawn to what they
// said matters most. All areas can still reach full if everything is done
// (gamma only bends the curve, it never caps below 1).
const FILL_GAMMA: Record<Area['importance'], number> = {
  core: 1.35, // needs more to look full
  matters: 1.0,
  optional: 0.6, // fills readily
};

// The petal's fill for one area, on a rolling window. Two tiers:
//   1. each tend habit contributes its own adherence (completed / expected),
//      weighted by its share within the area (habit.weight, equal by default);
//   2. the area's importance bends how readily that fills.
// Tugs (ease habits) subtract, floored at zero. An area with no tend habits
// reads as 0, the calm "ready to grow" rest state.
//
// Defaults to the Bloom's 14 day window ending today; Insights' balance bars
// pass 30, and the Bloom garden passes an `endISO` to read a past week's bloom.
export function computeAreaActivity(
  area: Area,
  habits: Habit[],
  logs: Log[],
  windowDays = 14,
  endISO: string = todayISO(),
): number {
  const areaHabits = habits.filter((h) => h.areaId === area.id && h.archivedAt == null);
  const tendHabits = areaHabits.filter((h) => h.polarity !== 'ease');
  if (tendHabits.length === 0) return 0;

  const from = isoDaysAgo(windowDays - 1, new Date(`${endISO}T00:00:00`));

  // Completed distinct days per tend habit, and total tug penalty, in one pass.
  const completedByHabit = new Map<string, Set<string>>();
  const easeById = new Map(areaHabits.filter((h) => h.polarity === 'ease').map((h) => [h.id, h]));
  let penalty = 0;
  for (const log of logs) {
    if (log.date < from || log.date > endISO) continue;
    const ease = easeById.get(log.habitId);
    if (ease) {
      penalty += ease.tugWeight ?? 1;
      continue;
    }
    if (!completedByHabit.has(log.habitId)) completedByHabit.set(log.habitId, new Set());
    completedByHabit.get(log.habitId)!.add(log.date);
  }

  // Weighted average of each habit's adherence (each clamped to its own cadence).
  const totalWeight = tendHabits.reduce((sum, h) => sum + (h.weight ?? 1), 0) || 1;
  let positive = 0;
  for (const h of tendHabits) {
    const expected = expectedCompletionsInWindow(h.cadence, windowDays);
    if (expected <= 0) continue;
    const completed = completedByHabit.get(h.id)?.size ?? 0;
    const adherence = Math.min(1, completed / expected);
    positive += ((h.weight ?? 1) / totalWeight) * adherence;
  }

  const penaltyFrac = Math.min(TUG_CAP, penalty * TUG_UNIT);
  const score = Math.max(0, positive - penaltyFrac);
  return Math.min(1, Math.pow(score, FILL_GAMMA[area.importance]));
}
