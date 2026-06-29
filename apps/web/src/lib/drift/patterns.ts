import type { Habit, Log } from '@harmony/shared';
import { daySegment, isoDaysAgo, weekdayOf } from '../time/dates';
import { joinWithAnd } from '../text';

// Pattern observations for the habit detail view (section 11.3). Rules based,
// surfaced only above a confidence threshold. Always about presence, never
// absence. Returns an empty array when nothing is confident enough, so the
// section stays hidden rather than filling space.

const WINDOW_DAYS = 60;
const MIN_COMPLETIONS = 5; // confidence floor for day and time patterns
const DOMINANCE = 0.6; // ">60% fall on the same days" (section 11.3)
const MIN_ADJACENCY = 3;
const STREAK_WEEKS = 7;
const MIN_STREAK = 4;
const MAX_OBSERVATIONS = 3;

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayOfWeekObservation(dates: string[]): string | null {
  const counts = new Array(7).fill(0);
  for (const d of dates) counts[weekdayOf(d)]++;

  const ranked = counts
    .map((count, day) => ({ count, day }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  // Smallest set of top days (up to 3) carrying more than 60% of completions.
  let cumulative = 0;
  const top: number[] = [];
  for (const { count, day } of ranked) {
    if (top.length >= 3) break;
    cumulative += count;
    top.push(day);
    if (cumulative / dates.length > DOMINANCE) break;
  }
  if (cumulative / dates.length <= DOMINANCE) return null;

  const set = new Set(top);
  if (set.size === 2 && set.has(0) && set.has(6)) {
    return 'You tend to do this on weekends.';
  }
  const names = top.sort((a, b) => a - b).map((d) => WEEKDAY_NAMES[d]);
  return `You tend to do this on ${joinWithAnd(names)}.`;
}

function timeOfDayObservation(logs: Log[]): string | null {
  const counts: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  for (const log of logs) counts[daySegment(new Date(log.loggedAt))]++;

  const total = logs.length;
  const [topSegment, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (topCount / total <= DOMINANCE) return null;

  if (topSegment === 'night') return 'You usually tend to this at night.';
  return `You usually tend to this in the ${topSegment}.`;
}

function adjacencyObservation(
  habit: Habit,
  habitDates: Set<string>,
  allLogs: Log[],
  habits: Habit[],
): string | null {
  let best: { name: string; overlap: number } | null = null;

  for (const other of habits) {
    if (other.id === habit.id || other.areaId == null) continue;
    const otherDates = new Set(allLogs.filter((l) => l.habitId === other.id).map((l) => l.date));
    let overlap = 0;
    for (const d of habitDates) if (otherDates.has(d)) overlap++;
    if (overlap < MIN_ADJACENCY) continue;
    if (overlap / habitDates.size > DOMINANCE && (!best || overlap > best.overlap)) {
      best = { name: other.name, overlap };
    }
  }

  return best ? `You often pair this with ${best.name}.` : null;
}

function streakObservation(dates: string[], now: Date): string | null {
  let weeksPresent = 0;
  for (let w = 0; w < STREAK_WEEKS; w++) {
    const weekEnd = isoDaysAgo(w * 7, now);
    const weekStart = isoDaysAgo(w * 7 + 6, now);
    if (dates.some((d) => d >= weekStart && d <= weekEnd)) weeksPresent++;
  }
  if (weeksPresent < MIN_STREAK) return null;
  return `You've shown up for this in ${weeksPresent} of the last ${STREAK_WEEKS} weeks.`;
}

export function detectHabitPatterns(
  habit: Habit,
  allLogs: Log[],
  habits: Habit[],
  now: Date = new Date(),
): string[] {
  const since = isoDaysAgo(WINDOW_DAYS - 1, now);
  const habitLogs = allLogs.filter((l) => l.habitId === habit.id && l.date >= since);
  const dates = Array.from(new Set(habitLogs.map((l) => l.date)));

  const observations: string[] = [];

  if (dates.length >= MIN_COMPLETIONS) {
    const dow = dayOfWeekObservation(dates);
    if (dow) observations.push(dow);

    const tod = timeOfDayObservation(habitLogs);
    if (tod) observations.push(tod);

    const adjacency = adjacencyObservation(habit, new Set(dates), allLogs, habits);
    if (adjacency) observations.push(adjacency);
  }

  const streak = streakObservation(dates, now);
  if (streak) observations.push(streak);

  return observations.slice(0, MAX_OBSERVATIONS);
}
