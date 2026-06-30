import type { Area, Habit, Log } from '@harmony/shared';
import { expectedCompletionsInWindow } from '../../lib/time/cadence';
import { isoDaysAgo } from '../../lib/time/dates';

// A typical-cadence area (doing exactly what its habits ask) sits at 0.7
// activity, per section 9.2. Above-typical effort can still climb toward 1.
const TYPICAL_RATIO_TARGET = 0.7;

// Rolling completion ratio for the habits in one area, normalised so hitting
// cadence exactly reads as 0.7. An area with no active habits reads as 0,
// which is the calm "ready to grow" rest state, not a broken one.
//
// Defaults to the Bloom's 14 day window (section 9.2); Insights' area balance
// bars (section 13.2) call this with windowDays=30 instead, same formula.
export function computeAreaActivity(
  area: Area,
  habits: Habit[],
  logs: Log[],
  windowDays = 14,
): number {
  const areaHabits = habits.filter((h) => h.areaId === area.id);
  if (areaHabits.length === 0) return 0;

  const from = isoDaysAgo(windowDays - 1);
  const tendIds = new Set(areaHabits.filter((h) => h.polarity !== 'ease').map((h) => h.id));
  const easeById = new Map(areaHabits.filter((h) => h.polarity === 'ease').map((h) => [h.id, h]));

  const completedDates = new Set<string>();
  let penalty = 0; // tugs eat into completions, in equivalent missed sessions
  for (const log of logs) {
    if (log.date < from) continue;
    if (tendIds.has(log.habitId)) {
      completedDates.add(`${log.habitId}:${log.date}`);
    } else {
      const ease = easeById.get(log.habitId);
      if (ease) penalty += ease.tugWeight ?? 1;
    }
  }

  const expected = areaHabits
    .filter((h) => h.polarity !== 'ease')
    .reduce((sum, h) => sum + expectedCompletionsInWindow(h.cadence, windowDays), 0);
  if (expected <= 0) return 0;

  // Tugs subtract from completions: honest, but floored at zero so a single slip
  // can never push a petal "negative" or punitively erase the whole window.
  const effective = Math.max(0, completedDates.size - penalty);
  return Math.min(1, (effective / expected) * TYPICAL_RATIO_TARGET);
}
