import type { Area, Habit, Log } from '@harmony/shared';
import { expectedCompletionsInWindow } from '@harmony/shared';
import { daySegment, daysBetween, isoDaysAgo, todayISO, weekdayOf } from '../time/dates';

// The analytics engine behind the Insights screen. Pure and deterministic
// (given `now`), so every chart and sentence is derived from the same numbers
// and the logic is unit-tested on its own. "Rich but gentle": real counts and
// ratios, framed around showing up rather than streaks to break. A focus area
// can scope the whole reading to one part of life.

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
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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

export interface CalendarCell {
  date: string;
  count: number;
  ratio: number; // 0..1 intensity
  future: boolean; // a day yet to come (shown empty, styled apart from a missed day)
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
  bestWeekday: number | null;
  lastDate: string | null;
  spark: number[]; // per-bucket ratio, for a mini sparkline
}

export interface TugStat {
  habit: Habit;
  areaName: string;
  count: number;
  lastDate: string | null;
  daysSince: number | null;
}

export interface InsightsSummary {
  tends: number; // total tend completions in range
  daysShownUp: number; // distinct days with at least one tend
  activeAreas: number; // areas tended at least once (whole life)
  activeHabits: number; // habits tended at least once (in scope)
  topAreaName: string | null;
}

export interface Insights {
  range: InsightsRange;
  focusAreaId: string | null;
  from: string;
  to: string;
  hasData: boolean;
  summary: InsightsSummary;
  runs: { current: number; longest: number };
  trend: TrendPoint[];
  trendDelta: number; // avg ratio now minus the previous equal period (0 for all-time)
  prevTends: number;
  calendar: CalendarCell[]; // daily, bounded to ~1 year
  weekday: number[]; // length 7, Sun..Sat
  segments: { segment: Segment; count: number }[];
  bestWeekday: number | null;
  bestSegment: Segment | null;
  areas: AreaStat[]; // always whole-life, for balance + constellation
  habits: HabitStat[]; // in scope
  tugs: TugPoint[];
  tugStats: TugStat[];
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
      buckets.push({
        key: iso,
        label: range === 'week' ? WEEKDAY_LABELS[weekdayOf(iso)] : iso.slice(-2),
        start: iso,
        end: iso,
        days: 1,
      });
    }
    return buckets;
  }

  const start = range === 'year' ? new Date(now.getFullYear(), now.getMonth() - 11, 1) : firstOfMonth(new Date(`${firstISO}T00:00:00`));
  const buckets: Bucket[] = [];
  const cursor = new Date(start);
  let guard = 0;
  while (cursor <= now && guard++ < 60) {
    const s = todayISO(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    const lastOfMonth = todayISO(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    const end = lastOfMonth < today ? lastOfMonth : today;
    buckets.push({ key: s.slice(0, 7), label: monthShort(cursor), start: s, end, days: daysBetween(s, end) + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

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

// Longest and current run of consecutive calendar days that saw at least one
// tend, within [from, to]. "current" is the run ending today (0 if none today).
function computeRuns(days: Set<string>, from: string, to: string): { current: number; longest: number } {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  let running = 0;
  let longest = 0;
  for (const t = new Date(start); t <= end; t.setDate(t.getDate() + 1)) {
    if (days.has(todayISO(t))) {
      running++;
      if (running > longest) longest = running;
    } else {
      running = 0;
    }
  }
  return { current: running, longest };
}

function argmax(arr: number[]): number | null {
  let best = -1;
  let idx: number | null = null;
  arr.forEach((v, i) => {
    if (v > best && v > 0) {
      best = v;
      idx = i;
    }
  });
  return idx;
}

function dailyRange(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  for (const t = new Date(start); t <= end; t.setDate(t.getDate() + 1)) out.push(todayISO(t));
  return out;
}

export function computeInsights(
  input: { areas: Area[]; habits: Habit[]; logs: Log[] },
  range: InsightsRange,
  opts: { now?: Date; focusAreaId?: string | null } = {},
): Insights {
  const now = opts.now ?? new Date();
  const focusAreaId = opts.focusAreaId ?? null;

  const allAreas = input.areas.filter((a) => a.archivedAt == null);
  const focusArea = focusAreaId ? allAreas.find((a) => a.id === focusAreaId) ?? null : null;

  const allTend = input.habits.filter((h) => h.archivedAt == null && h.polarity !== 'ease');
  const allEase = input.habits.filter((h) => h.archivedAt == null && h.polarity === 'ease');
  const tendHabits = focusArea ? allTend.filter((h) => h.areaId === focusArea.id) : allTend;
  const easeHabits = focusArea ? allEase.filter((h) => h.areaId === focusArea.id) : allEase;

  const easeIds = new Set(input.habits.filter((h) => h.polarity === 'ease').map((h) => h.id));
  const tendLogs = input.logs.filter((l) => !easeIds.has(l.habitId));
  const easeLogs = input.logs.filter((l) => easeIds.has(l.habitId));
  const scopedTugLogs = focusArea ? easeLogs.filter((l) => easeHabits.some((h) => h.id === l.habitId)) : easeLogs;
  const tendIds = new Set(tendHabits.map((h) => h.id));

  const today = todayISO(now);
  const firstISO = earliestDate(allAreas, input.logs, now);
  const from =
    range === 'week' ? isoDaysAgo(6, now) : range === 'month' ? isoDaysAgo(29, now) : range === 'year' ? isoDaysAgo(364, now) : firstISO;
  const rangeDays = daysBetween(from, today) + 1;

  const buckets = buildBuckets(range, now, firstISO);

  // Trend + tug series per bucket.
  const trend: TrendPoint[] = [];
  const tugs: TugPoint[] = [];
  for (const b of buckets) {
    const completed = completedDistinct(tendIds, tendLogs, b.start, b.end);
    const expected = expectedFor(tendHabits, b.days);
    const ratio = expected > 0 ? Math.min(1, completed / expected) : 0;
    trend.push({ label: b.label, completed, expected, ratio });

    let penalty = 0;
    for (const l of scopedTugLogs) {
      if (l.date < b.start || l.date > b.end) continue;
      penalty += easeHabits.find((h) => h.id === l.habitId)?.tugWeight ?? 1;
    }
    tugs.push({ label: b.label, lift: ratio, drag: Math.min(TUG_CAP, penalty * TUG_UNIT) });
  }

  // Rhythm + shown-up days over the whole range.
  const weekday = new Array(7).fill(0) as number[];
  const segCounts: Record<Segment, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const shownUpDays = new Set<string>();
  for (const l of tendLogs) {
    if (!tendIds.has(l.habitId)) continue;
    if (l.date < from || l.date > today) continue;
    weekday[weekdayOf(l.date)]++;
    segCounts[daySegment(new Date(l.loggedAt))]++;
    shownUpDays.add(l.date);
  }
  const segments = SEGMENTS.map((segment) => ({ segment, count: segCounts[segment] }));
  const bestSegIdx = argmax(SEGMENTS.map((s) => segCounts[s]));

  const runs = computeRuns(shownUpDays, from, today);

  // Momentum vs the previous equal-length period (n/a for all-time).
  let prevTends = 0;
  let trendDelta = 0;
  if (range !== 'all') {
    const span = range === 'week' ? 7 : range === 'month' ? 30 : 365;
    const prevFrom = isoDaysAgo(span * 2 - 1, now);
    const prevTo = isoDaysAgo(span, now);
    prevTends = completedDistinct(tendIds, tendLogs, prevFrom, prevTo);
    const prevExpected = expectedFor(tendHabits, span);
    const curExpected = expectedFor(tendHabits, rangeDays);
    const curRatio = curExpected > 0 ? completedDistinct(tendIds, tendLogs, from, today) / curExpected : 0;
    const prevRatio = prevExpected > 0 ? prevTends / prevExpected : 0;
    trendDelta = curRatio - prevRatio;
  }

  // Calendar heatmap. Week and month show their rolling window; year and
  // all-time show the whole calendar year, including the months still to come so
  // the grid reads as a complete, unfolding year rather than one cut off today.
  const yyyy = now.getFullYear();
  const calFrom = range === 'year' ? `${yyyy}-01-01` : range === 'all' ? firstISO : from;
  const calTo = range === 'year' || range === 'all' ? `${yyyy}-12-31` : today;
  const dayCount = new Map<string, number>();
  for (const l of tendLogs) {
    if (!tendIds.has(l.habitId)) continue;
    if (l.date < calFrom || l.date > today) continue;
    dayCount.set(l.date, (dayCount.get(l.date) ?? 0) + 1);
  }
  const perDayExpected = Math.max(1, expectedFor(tendHabits, 1));
  const calendar: CalendarCell[] = dailyRange(calFrom, calTo).map((date) => {
    const future = date > today;
    const count = future ? 0 : dayCount.get(date) ?? 0;
    return { date, count, ratio: future ? 0 : Math.min(1, count / perDayExpected), future };
  });

  // Per-area stats (whole life, for balance + constellation).
  const areaStats: AreaStat[] = allAreas.map((area) => {
    const areaTend = allTend.filter((h) => h.areaId === area.id);
    const ids = new Set(areaTend.map((h) => h.id));
    const completed = completedDistinct(ids, tendLogs, from, today);
    const expected = expectedFor(areaTend, rangeDays);
    const tugCount = easeLogs.filter((l) => allEase.find((e) => e.id === l.habitId)?.areaId === area.id && l.date >= from && l.date <= today).length;
    return { area, completed, expected, ratio: expected > 0 ? Math.min(1, completed / expected) : 0, tugCount };
  });

  // Per-habit stats (in scope), each with a sparkline and its best weekday.
  const areaColor = new Map(allAreas.map((a) => [a.id, a.color]));
  const habitStats: HabitStat[] = tendHabits.map((habit) => {
    const hist = tendLogs.filter((l) => l.habitId === habit.id);
    const inRange = hist.filter((l) => l.date >= from && l.date <= today);
    const completed = new Set(inRange.map((l) => l.date)).size;
    const expected = expectedCompletionsInWindow(habit.cadence, rangeDays);
    const wd = new Array(7).fill(0) as number[];
    for (const l of inRange) wd[weekdayOf(l.date)]++;
    const lastDate = hist.length ? hist.reduce((a, b) => (a.date > b.date ? a : b)).date : null;
    const spark = buckets.map((b) => {
      const c = completedDistinct(new Set([habit.id]), tendLogs, b.start, b.end);
      const e = expectedCompletionsInWindow(habit.cadence, b.days);
      return e > 0 ? Math.min(1, c / e) : 0;
    });
    return {
      habit,
      color: habit.color ?? areaColor.get(habit.areaId) ?? '#5a636f',
      completed,
      expected,
      ratio: expected > 0 ? Math.min(1, completed / expected) : 0,
      bestWeekday: argmax(wd),
      lastDate,
      spark,
    };
  });

  // Tug detail: per tug, how often and how long since the last one.
  const tugStats: TugStat[] = easeHabits
    .map((habit) => {
      const hist = easeLogs.filter((l) => l.habitId === habit.id);
      const inRange = hist.filter((l) => l.date >= from && l.date <= today);
      const lastDate = hist.length ? hist.reduce((a, b) => (a.date > b.date ? a : b)).date : null;
      return {
        habit,
        areaName: allAreas.find((a) => a.id === habit.areaId)?.name ?? '',
        count: inRange.length,
        lastDate,
        daysSince: lastDate ? daysBetween(lastDate, today) : null,
      };
    })
    .sort((a, b) => b.count - a.count);

  const tugTotals = areaStats.filter((a) => a.tugCount > 0).map((a) => ({ area: a.area, count: a.tugCount })).sort((a, b) => b.count - a.count);

  const tends = completedDistinct(tendIds, tendLogs, from, today);
  const scopedActiveAreas = areaStats.filter((a) => a.completed > 0);
  const topArea = [...scopedActiveAreas].sort((a, b) => b.completed - a.completed)[0];
  const summary: InsightsSummary = {
    tends,
    daysShownUp: shownUpDays.size,
    activeAreas: scopedActiveAreas.length,
    activeHabits: habitStats.filter((h) => h.completed > 0).length,
    topAreaName: (focusArea ?? topArea?.area)?.name ?? null,
  };

  return {
    range,
    focusAreaId,
    from,
    to: today,
    hasData: tends > 0 || scopedTugLogs.some((l) => l.date >= from && l.date <= today),
    summary,
    runs,
    trend,
    trendDelta,
    prevTends,
    calendar,
    weekday,
    segments,
    bestWeekday: argmax(weekday),
    bestSegment: bestSegIdx == null ? null : SEGMENTS[bestSegIdx],
    areas: areaStats,
    habits: habitStats.sort((a, b) => b.ratio - a.ratio),
    tugs,
    tugStats,
    tugTotals,
  };
}
