import type { Area, Habit, Log } from '@harmony/shared';
import { expectedCompletionsInWindow } from '@harmony/shared';
import { daySegment, daysBetween, isoDaysAgo, todayISO, weekdayOf } from '../time/dates';

// The analytics engine behind the Insights screen. Pure and deterministic
// (given `now`), so every chart is derived from the same numbers and the logic
// is unit-tested on its own. "Rich but gentle": real counts and ratios, framed
// around showing up rather than streaks to break.

export type InsightsRange = 'week' | 'month' | 'year' | 'all';

export const RANGE_OPTIONS: { value: InsightsRange; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All' },
];

// How much one logged tug weighs against an area, mirrored from the Bloom so the
// "lift vs drag" reading matches the petals.
const TUG_UNIT = 0.12;
const TUG_CAP = 0.6;

export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const SEGMENTS = ['morning', 'afternoon', 'evening', 'night'] as const;
export type Segment = (typeof SEGMENTS)[number];
export const SEGMENT_LABELS: Record<Segment, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

export interface Bucket {
  key: string;
  label: string;
  start: string; // inclusive ISO
  end: string; // inclusive ISO
  days: number;
}

export interface TrendPoint {
  label: string;
  completed: number;
  expected: number;
  ratio: number; // completed / expected, clamped to [0, 1]
}

export interface TugPoint {
  label: string;
  lift: number; // tend adherence 0..1
  drag: number; // tug penalty as a 0..1 fraction (capped)
}

export interface AreaStat {
  area: Area;
  completed: number;
  expected: number;
  ratio: number;
  tugCount: number;
}

export interface HabitStat {
  habit: Habit;
  color: string;
  completed: number;
  expected: number;
  ratio: number;
}

export interface InsightsSummary {
  tends: number; // total tend completions in range
  daysShownUp: number; // distinct days with at least one tend
  activeAreas: number; // areas tended at least once
  topAreaName: string | null;
}

export interface Insights {
  range: InsightsRange;
  from: string;
  to: string;
  hasData: boolean;
  summary: InsightsSummary;
  trend: TrendPoint[];
  weekday: number[]; // length 7, Sun..Sat
  segments: { segment: Segment; count: number }[];
  areas: AreaStat[];
  habits: HabitStat[];
  tugs: TugPoint[];
  tugTotals: { area: Area; count: number }[];
}

const monthShort = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' });
const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

function earliestDate(areas: Area[], logs: Log[], now: Date): string {
  let earliest = todayISO(now);
  for (const l of logs) if (l.date < earliest) earliest = l.date;
  for (const a of areas) {
    const created = todayISO(new Date(a.createdAt));
    if (created < earliest) earliest = created;
  }
  return earliest;
}

// The buckets a range is charted over: daily for a week or month, monthly for a
// year or all-time. Each bucket carries its own day-count so expected
// completions scale correctly.
export function buildBuckets(range: InsightsRange, now: Date, firstISO: string): Bucket[] {
  const today = todayISO(now);
  if (range === 'week' || range === 'month') {
    const n = range === 'week' ? 7 : 30;
    const buckets: Bucket[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const iso = isoDaysAgo(i, now);
      const wd = weekdayOf(iso);
      buckets.push({
        key: iso,
        label: range === 'week' ? WEEKDAY_LABELS[wd] : iso.slice(-2),
        start: iso,
        end: iso,
        days: 1,
      });
    }
    return buckets;
  }

  // Monthly buckets (year = last 12 months; all = from first activity).
  const start = range === 'year' ? new Date(now.getFullYear(), now.getMonth() - 11, 1) : firstOfMonth(new Date(`${firstISO}T00:00:00`));
  const buckets: Bucket[] = [];
  const cursor = new Date(start);
  // Guard against a pathological span; cap at 60 months.
  let guard = 0;
  while (cursor <= now && guard++ < 60) {
    const s = todayISO(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    const lastOfMonth = todayISO(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    const end = lastOfMonth < today ? lastOfMonth : today;
    buckets.push({
      key: s.slice(0, 7),
      label: monthShort(cursor),
      start: s,
      end,
      days: daysBetween(s, end) + 1,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

// Distinct habit-days for a set of habits within [from, to].
function completedDistinct(habitIds: Set<string>, logs: Log[], from: string, to: string): number {
  const seen = new Set<string>();
  for (const l of logs) {
    if (!habitIds.has(l.habitId)) continue;
    if (l.date < from || l.date > to) continue;
    seen.add(`${l.habitId}:${l.date}`);
  }
  return seen.size;
}

function expectedFor(habits: Habit[], days: number): number {
  return habits.reduce((sum, h) => sum + expectedCompletionsInWindow(h.cadence, days), 0);
}

export function computeInsights(
  input: { areas: Area[]; habits: Habit[]; logs: Log[] },
  range: InsightsRange,
  now: Date = new Date(),
): Insights {
  const areas = input.areas.filter((a) => a.archivedAt == null);
  const tendHabits = input.habits.filter((h) => h.archivedAt == null && h.polarity !== 'ease');
  const easeHabits = input.habits.filter((h) => h.archivedAt == null && h.polarity === 'ease');
  const easeIds = new Set(input.habits.filter((h) => h.polarity === 'ease').map((h) => h.id));
  const tendLogs = input.logs.filter((l) => !easeIds.has(l.habitId));
  const easeLogs = input.logs.filter((l) => easeIds.has(l.habitId));
  const tendIds = new Set(tendHabits.map((h) => h.id));

  const today = todayISO(now);
  const firstISO = earliestDate(areas, input.logs, now);
  const from =
    range === 'week' ? isoDaysAgo(6, now) : range === 'month' ? isoDaysAgo(29, now) : range === 'year' ? isoDaysAgo(364, now) : firstISO;

  const buckets = buildBuckets(range, now, firstISO);

  // Trend + tug series, per bucket.
  const trend: TrendPoint[] = [];
  const tugs: TugPoint[] = [];
  for (const b of buckets) {
    const completed = completedDistinct(tendIds, tendLogs, b.start, b.end);
    const expected = expectedFor(tendHabits, b.days);
    const ratio = expected > 0 ? Math.min(1, completed / expected) : 0;
    trend.push({ label: b.label, completed, expected, ratio });

    let penalty = 0;
    for (const l of easeLogs) {
      if (l.date < b.start || l.date > b.end) continue;
      penalty += easeHabits.find((h) => h.id === l.habitId)?.tugWeight ?? 1;
    }
    tugs.push({ label: b.label, lift: ratio, drag: Math.min(TUG_CAP, penalty * TUG_UNIT) });
  }

  // Weekday + time-of-day rhythm over the whole range.
  const weekday = new Array(7).fill(0) as number[];
  const segmentCounts: Record<Segment, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const shownUpDays = new Set<string>();
  for (const l of tendLogs) {
    if (l.date < from || l.date > today) continue;
    weekday[weekdayOf(l.date)]++;
    const seg = daySegment(new Date(l.loggedAt));
    segmentCounts[seg]++;
    shownUpDays.add(l.date);
  }
  const segments = SEGMENTS.map((segment) => ({ segment, count: segmentCounts[segment] }));

  // Per-area stats.
  const rangeDays = daysBetween(from, today) + 1;
  const areaStats: AreaStat[] = areas.map((area) => {
    const areaTend = tendHabits.filter((h) => h.areaId === area.id);
    const ids = new Set(areaTend.map((h) => h.id));
    const completed = completedDistinct(ids, tendLogs, from, today);
    const expected = expectedFor(areaTend, rangeDays);
    const tugCount = easeLogs.filter((l) => {
      const h = easeHabits.find((e) => e.id === l.habitId);
      return h?.areaId === area.id && l.date >= from && l.date <= today;
    }).length;
    return { area, completed, expected, ratio: expected > 0 ? Math.min(1, completed / expected) : 0, tugCount };
  });

  // Per-habit stats.
  const areaColor = new Map(areas.map((a) => [a.id, a.color]));
  const habitStats: HabitStat[] = tendHabits.map((habit) => {
    const completed = completedDistinct(new Set([habit.id]), tendLogs, from, today);
    const expected = expectedCompletionsInWindow(habit.cadence, rangeDays);
    return {
      habit,
      color: habit.color ?? areaColor.get(habit.areaId) ?? '#5a636f',
      completed,
      expected,
      ratio: expected > 0 ? Math.min(1, completed / expected) : 0,
    };
  });

  const tugTotals = areas
    .map((area) => ({
      area,
      count: easeLogs.filter((l) => {
        const h = easeHabits.find((e) => e.id === l.habitId);
        return h?.areaId === area.id && l.date >= from && l.date <= today;
      }).length,
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  const tends = completedDistinct(tendIds, tendLogs, from, today);
  const topArea = [...areaStats].filter((a) => a.completed > 0).sort((a, b) => b.completed - a.completed)[0];
  const summary: InsightsSummary = {
    tends,
    daysShownUp: shownUpDays.size,
    activeAreas: areaStats.filter((a) => a.completed > 0).length,
    topAreaName: topArea?.area.name ?? null,
  };

  return {
    range,
    from,
    to: today,
    hasData: tends > 0 || easeLogs.some((l) => l.date >= from && l.date <= today),
    summary,
    trend,
    weekday,
    segments,
    areas: areaStats,
    habits: habitStats.sort((a, b) => b.ratio - a.ratio),
    tugs,
    tugTotals,
  };
}
