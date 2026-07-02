import { describe, expect, it } from 'vitest';
import { isoDaysAgo } from '@harmony/shared';
import { buildBuckets, computeInsights } from '../../apps/web/src/lib/insights/analytics';
import { makeArea, makeHabit, makeLog } from '../fixtures';

const NOW = new Date(2026, 5, 15, 12, 0); // 2026-06-15, local noon
const MORNING = new Date(2026, 5, 15, 8, 0).getTime(); // a local-morning timestamp
const at = (now: Date) => ({ now });

// A daily-habit completion on each of the last `n` days.
function lastNDays(habitId: string, areaId: string, n: number) {
  return Array.from({ length: n }, (_, i) => makeLog({ habitId, areaId, date: isoDaysAgo(i, NOW), loggedAt: MORNING }));
}

describe('buildBuckets', () => {
  it('makes 7 daily buckets for a week, ending today', () => {
    const b = buildBuckets('week', NOW, '2026-01-01');
    expect(b).toHaveLength(7);
    expect(b.every((x) => x.days === 1)).toBe(true);
    expect(b[6].start).toBe('2026-06-15');
  });

  it('makes 30 daily buckets for a month', () => {
    expect(buildBuckets('month', NOW, '2026-01-01')).toHaveLength(30);
  });

  it('makes 12 monthly buckets for a year', () => {
    const b = buildBuckets('year', NOW, '2020-01-01');
    expect(b).toHaveLength(12);
    expect(b[11].label).toBe('Jun');
  });

  it('spans from first activity for all-time', () => {
    const b = buildBuckets('all', NOW, '2026-04-10');
    expect(b.map((x) => x.label)).toEqual(['Apr', 'May', 'Jun']);
  });
});

describe('computeInsights', () => {
  const area = makeArea({ id: 'a', importance: 'matters' });
  const habit = makeHabit({ id: 'h', areaId: 'a', cadence: { kind: 'daily' } });

  it('reports no data when nothing has been logged', () => {
    const out = computeInsights({ areas: [area], habits: [habit], logs: [] }, 'week', at(NOW));
    expect(out.hasData).toBe(false);
    expect(out.summary.tends).toBe(0);
  });

  it('scores a fully-tended week at ratio 1 across the trend', () => {
    const out = computeInsights({ areas: [area], habits: [habit], logs: lastNDays('h', 'a', 7) }, 'week', at(NOW));
    expect(out.trend).toHaveLength(7);
    expect(out.trend.every((p) => p.ratio === 1)).toBe(true);
    expect(out.summary.tends).toBe(7);
    expect(out.summary.daysShownUp).toBe(7);
    expect(out.areas[0].ratio).toBeCloseTo(1, 5);
  });

  it('computes current and longest runs of consecutive days', () => {
    const out = computeInsights({ areas: [area], habits: [habit], logs: lastNDays('h', 'a', 7) }, 'week', at(NOW));
    expect(out.runs.current).toBe(7);
    expect(out.runs.longest).toBe(7);
  });

  it('breaks the current run when today has no log', () => {
    // Logged the 5 days ending yesterday, nothing today.
    const logs = Array.from({ length: 5 }, (_, i) => makeLog({ habitId: 'h', areaId: 'a', date: isoDaysAgo(i + 1, NOW), loggedAt: MORNING }));
    const out = computeInsights({ areas: [area], habits: [habit], logs }, 'week', at(NOW));
    expect(out.runs.current).toBe(0);
    expect(out.runs.longest).toBe(5);
  });

  it('spreads weekday rhythm and picks the busiest day/time', () => {
    const out = computeInsights({ areas: [area], habits: [habit], logs: lastNDays('h', 'a', 7) }, 'week', at(NOW));
    expect(out.weekday.reduce((s, n) => s + n, 0)).toBe(7);
    expect(out.bestSegment).toBe('morning');
    expect(out.bestWeekday).not.toBeNull();
  });

  it('shows the whole calendar year with only the logged days warmed', () => {
    const out = computeInsights({ areas: [area], habits: [habit], logs: lastNDays('h', 'a', 7) }, 'week', at(NOW));
    expect(out.calendar).toHaveLength(365); // an "every day" overview, not the rolling window
    expect(out.calendar.filter((c) => c.count === 1)).toHaveLength(7);
    expect(out.calendar.some((c) => c.future)).toBe(true); // months still to come
  });

  it('spans the whole calendar year, including future days, for the year range', () => {
    const out = computeInsights({ areas: [area], habits: [habit], logs: lastNDays('h', 'a', 7) }, 'year', at(NOW));
    expect(out.calendar).toHaveLength(365); // 2026 is not a leap year
    expect(out.calendar[0].date).toBe('2026-01-01');
    expect(out.calendar[out.calendar.length - 1].date).toBe('2026-12-31');
    expect(out.calendar.some((c) => c.future)).toBe(true); // months still to come
    expect(out.calendar.filter((c) => c.future).every((c) => c.count === 0)).toBe(true);
  });

  it('reports positive momentum when this week beats the previous', () => {
    // Full this week; nothing the week before.
    const out = computeInsights({ areas: [area], habits: [habit], logs: lastNDays('h', 'a', 7) }, 'week', at(NOW));
    expect(out.trendDelta).toBeGreaterThan(0.5);
    expect(out.prevTends).toBe(0);
  });

  it('counts tugs as drag without inflating tends', () => {
    const tug = makeHabit({ id: 'tug', areaId: 'a', polarity: 'ease', tugWeight: 1 });
    const logs = [...lastNDays('h', 'a', 7), makeLog({ habitId: 'tug', areaId: 'a', date: isoDaysAgo(1, NOW), loggedAt: MORNING })];
    const out = computeInsights({ areas: [area], habits: [habit, tug], logs }, 'week', at(NOW));
    expect(out.summary.tends).toBe(7);
    expect(out.tugTotals).toEqual([{ area, count: 1 }]);
    expect(out.tugStats.find((t) => t.habit.id === 'tug')?.count).toBe(1);
    expect(out.tugs.some((t) => t.drag > 0)).toBe(true);
  });

  it('scopes everything to a focused area', () => {
    const areaB = makeArea({ id: 'b', name: 'Mind', importance: 'matters' });
    const habitB = makeHabit({ id: 'hb', areaId: 'b', cadence: { kind: 'daily' } });
    const logs = [...lastNDays('h', 'a', 7), ...lastNDays('hb', 'b', 3)];
    const out = computeInsights({ areas: [area, areaB], habits: [habit, habitB], logs }, 'week', { now: NOW, focusAreaId: 'b' });
    expect(out.summary.tends).toBe(3); // only area B's habit
    expect(out.habits).toHaveLength(1);
    expect(out.habits[0].habit.id).toBe('hb');
    // Whole-life area stats stay available for context.
    expect(out.areas).toHaveLength(2);
  });

  it('gives each habit a sparkline and best weekday', () => {
    const out = computeInsights({ areas: [area], habits: [habit], logs: lastNDays('h', 'a', 7) }, 'week', at(NOW));
    const stat = out.habits[0];
    expect(stat.spark).toHaveLength(7);
    expect(stat.completed).toBe(7);
    expect(stat.lastDate).toBe('2026-06-15');
  });

  it('reflects partial adherence in an area ratio', () => {
    const out = computeInsights({ areas: [area], habits: [habit], logs: lastNDays('h', 'a', 3) }, 'week', at(NOW));
    expect(out.areas[0].ratio).toBeCloseTo(3 / 7, 5);
    expect(out.summary.topAreaName).toBe('Body');
  });
});
