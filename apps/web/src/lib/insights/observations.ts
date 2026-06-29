import type { Area, Habit, Log } from '@harmony/shared';
import { WEEKDAY_NAMES } from '../drift/patterns';
import { daySegment, isoDaysAgo, weekdayOf } from '../time/dates';

// Gentle observations (section 13.3). Up to three, surfaced only when a rule
// triggers. Rules-based, no LLM, same spirit as the habit detail patterns but
// looking across the whole week and the whole habit set.

const MAX_OBSERVATIONS = 3;
const PRIOR_WEEKS = 4;
const DOMINANCE = 0.6;
const MIN_PAIR_LOGS = 5;
const QUIET_RATIO = 0.4;

function weeklyRecordObservation(areas: Area[], habits: Habit[], logs: Log[], now: Date): string | null {
  let best: { area: Area; count: number } | null = null;

  for (const area of areas) {
    const habitIds = new Set(habits.filter((h) => h.areaId === area.id).map((h) => h.id));
    const weeklyCounts: number[] = [];
    for (let w = 0; w < PRIOR_WEEKS + 1; w++) {
      const from = isoDaysAgo(w * 7 + 6, now);
      const to = isoDaysAgo(w * 7, now);
      const count = new Set(
        logs
          .filter((l) => habitIds.has(l.habitId) && l.date >= from && l.date <= to)
          .map((l) => `${l.habitId}:${l.date}`),
      ).size;
      weeklyCounts.push(count);
    }

    const [thisWeek, ...priorWeeks] = weeklyCounts;
    if (thisWeek === 0 || priorWeeks.every((c) => c === 0)) continue;
    if (thisWeek > Math.max(...priorWeeks) && (!best || thisWeek > best.count)) {
      best = { area, count: thisWeek };
    }
  }

  return best
    ? `You've added ${best.count} log${best.count === 1 ? '' : 's'} to ${best.area.name} this week, your most in a month.`
    : null;
}

function mostConsistentTimeObservation(habits: Habit[], logs: Log[]): string | null {
  let best: { habit: Habit; day: number; segment: string; share: number } | null = null;

  for (const habit of habits) {
    const habitLogs = logs.filter((l) => l.habitId === habit.id);
    if (habitLogs.length < MIN_PAIR_LOGS) continue;

    const counts = new Map<string, number>();
    for (const log of habitLogs) {
      const day = weekdayOf(log.date);
      const segment = daySegment(new Date(log.loggedAt));
      const key = `${day}:${segment}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    for (const [key, count] of counts) {
      const share = count / habitLogs.length;
      if (share > DOMINANCE && (!best || share > best.share)) {
        const [day, segment] = key.split(':');
        best = { habit, day: Number(day), segment, share };
      }
    }
  }

  if (!best) return null;
  const dayName = WEEKDAY_NAMES[best.day];
  const segmentWord = best.segment === 'night' ? 'nights' : `${best.segment}s`;
  return `${dayName} ${segmentWord} are your most consistent time for ${best.habit.name}.`;
}

function quieterThanUsualObservation(areas: Area[], habits: Habit[], logs: Log[], now: Date): string | null {
  let best: { area: Area; ratio: number } | null = null;

  for (const area of areas) {
    if (area.importance === 'optional' || !area.whySentence) continue;
    const habitIds = new Set(habits.filter((h) => h.areaId === area.id).map((h) => h.id));
    if (habitIds.size === 0) continue;

    const thisWeek = new Set(
      logs
        .filter((l) => habitIds.has(l.habitId) && l.date >= isoDaysAgo(6, now))
        .map((l) => `${l.habitId}:${l.date}`),
    ).size;
    const trailing = new Set(
      logs
        .filter((l) => habitIds.has(l.habitId) && l.date >= isoDaysAgo(27, now) && l.date <= isoDaysAgo(7, now))
        .map((l) => `${l.habitId}:${l.date}`),
    ).size;
    const trailingWeeklyAvg = trailing / 3;

    if (trailingWeeklyAvg < 1) continue; // not enough history to call this "usual"
    const ratio = thisWeek / trailingWeeklyAvg;
    if (ratio < QUIET_RATIO && (!best || ratio < best.ratio)) best = { area, ratio };
  }

  return best
    ? `${best.area.name} has been quieter than usual. You wrote: "${best.area.whySentence}"`
    : null;
}

export function gentleObservations(
  areas: Area[],
  habits: Habit[],
  logs: Log[],
  now: Date = new Date(),
): string[] {
  const activeAreas = areas.filter((a) => a.archivedAt == null);
  const activeHabits = habits.filter((h) => h.archivedAt == null);

  const candidates = [
    weeklyRecordObservation(activeAreas, activeHabits, logs, now),
    quieterThanUsualObservation(activeAreas, activeHabits, logs, now),
    mostConsistentTimeObservation(activeHabits, logs),
  ].filter((o): o is string => o != null);

  return candidates.slice(0, MAX_OBSERVATIONS);
}
