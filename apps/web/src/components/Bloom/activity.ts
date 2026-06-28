import type { Area, Habit, Log } from '@harmony/shared';
import { expectedCompletionsInWindow } from '../../lib/time/cadence';
import { isoDaysAgo } from '../../lib/time/dates';

const WINDOW_DAYS = 14;
// A typical-cadence area (doing exactly what its habits ask) sits at 0.7
// activity, per section 9.2. Above-typical effort can still climb toward 1.
const TYPICAL_RATIO_TARGET = 0.7;

// Rolling 14 day completion ratio for the habits in one area, normalised so
// hitting cadence exactly reads as 0.7. An area with no active habits reads
// as 0, which is the calm "ready to grow" rest state, not a broken one.
export function computeAreaActivity(area: Area, habits: Habit[], logs: Log[]): number {
  const areaHabits = habits.filter((h) => h.areaId === area.id);
  if (areaHabits.length === 0) return 0;

  const from = isoDaysAgo(WINDOW_DAYS - 1);
  const habitIds = new Set(areaHabits.map((h) => h.id));

  const completedDates = new Set<string>();
  for (const log of logs) {
    if (!habitIds.has(log.habitId) || log.date < from) continue;
    completedDates.add(`${log.habitId}:${log.date}`);
  }

  const expected = areaHabits.reduce(
    (sum, h) => sum + expectedCompletionsInWindow(h.cadence, WINDOW_DAYS),
    0,
  );
  if (expected <= 0) return 0;

  const ratio = completedDates.size / expected;
  return Math.min(1, ratio * TYPICAL_RATIO_TARGET);
}
