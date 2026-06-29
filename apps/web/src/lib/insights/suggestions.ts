import type { Area, Habit, Log } from '@harmony/shared';
import { WEEKDAY_NAMES } from '../drift/patterns';
import { weekdayOf } from '../time/dates';

// "What to do next" (section 13.4). Up to two, rules-based, and always a CTA
// to a specific in-app action, never bare advice.

const MAX_SUGGESTIONS = 2;
const DOMINANCE = 0.6;
const MIN_LOGS_FOR_DAY_PATTERN = 5;

export type Suggestion =
  | { kind: 'add-habit'; text: string; areaId: string }
  | { kind: 'move-habit'; text: string; habitId: string };

function needsAHabitSuggestion(areas: Area[], habits: Habit[]): Suggestion | null {
  const coreAreas = areas.filter((a) => a.importance === 'core' && a.archivedAt == null);
  for (const area of coreAreas) {
    const count = habits.filter((h) => h.areaId === area.id && h.archivedAt == null).length;
    if (count <= 1) {
      return {
        kind: 'add-habit',
        areaId: area.id,
        text: `Want to add a small ${area.name} habit? You've said it matters to you.`,
      };
    }
  }
  return null;
}

function strongestDaySuggestion(habits: Habit[], logs: Log[]): Suggestion | null {
  let best: { habit: Habit; day: number; share: number } | null = null;

  for (const habit of habits) {
    const habitLogs = logs.filter((l) => l.habitId === habit.id);
    if (habitLogs.length < MIN_LOGS_FOR_DAY_PATTERN) continue;

    const counts = new Array(7).fill(0);
    for (const log of habitLogs) counts[weekdayOf(log.date)]++;

    const topDay = counts.indexOf(Math.max(...counts));
    const share = counts[topDay] / habitLogs.length;
    if (share > DOMINANCE && (!best || share > best.share)) {
      best = { habit, day: topDay, share };
    }
  }

  if (!best) return null;
  return {
    kind: 'move-habit',
    habitId: best.habit.id,
    text: `${WEEKDAY_NAMES[best.day]} is your strongest day for ${best.habit.name}. Maybe move it there.`,
  };
}

export function whatToDoNext(areas: Area[], habits: Habit[], logs: Log[]): Suggestion[] {
  const activeAreas = areas.filter((a) => a.archivedAt == null);
  const activeHabits = habits.filter((h) => h.archivedAt == null);

  const suggestions = [
    needsAHabitSuggestion(activeAreas, activeHabits),
    strongestDaySuggestion(activeHabits, logs),
  ].filter((s): s is Suggestion => s != null);

  return suggestions.slice(0, MAX_SUGGESTIONS);
}
