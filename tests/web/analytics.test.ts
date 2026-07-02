import { describe, expect, it } from 'vitest';
import { isoDaysAgo } from '@harmony/shared';
import { buildBuckets, computeInsights } from '../../apps/web/src/lib/insights/analytics';
import { makeArea, makeHabit, makeLog } from '../fixtures';

const NOW = new Date(2026, 5, 15, 12, 0); // 2026-06-15, local noon
const MORNING = new Date(2026, 5, 15, 8, 0).getTime(); // a local-morning timestamp

// A daily-habit completion on each of the last `n` days.
function lastNDays(habitId: string, areaId: string, n: number) {
  return Array.from({ length: n }, (_, i) =>
    makeLog({ habitId, areaId, date: isoDaysAgo(i, NOW), loggedAt: MORNING }),
  );
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
    const out = computeInsights({ areas: [area], habits: [habit], logs: [] }, 'week', NOW);
    expect(out.hasData).toBe(false);
    expect(out.summary.tends).toBe(0);
  });

  it('scores a fully-tended week at ratio 1 across the trend', () => {
    const logs = lastNDays('h', 'a', 7);
    const out = computeInsights({ areas: [area], habits: [habit], logs }, 'week', NOW);
    expect(out.trend).toHaveLength(7);
    expect(out.trend.every((p) => p.ratio === 1)).toBe(true);
    expect(out.summary.tends).toBe(7);
    expect(out.summary.daysShownUp).toBe(7);
    expect(out.areas[0].ratio).toBeCloseTo(1, 5);
  });

  it('spreads weekday rhythm across a full consecutive week', () => {
    const out = computeInsights({ areas: [area], habits: [habit], logs: lastNDays('h', 'a', 7) }, 'week', NOW);
    expect(out.weekday.reduce((s, n) => s + n, 0)).toBe(7);
    expect(out.weekday.every((n) => n === 1)).toBe(true);
  });

  it('buckets completions into the time-of-day they were logged', () => {
    const out = computeInsights({ areas: [area], habits: [habit], logs: lastNDays('h', 'a', 3) }, 'week', NOW);
    const morning = out.segments.find((s) => s.segment === 'morning')!;
    expect(morning.count).toBe(3);
    expect(out.segments.filter((s) => s.segment !== 'morning').every((s) => s.count === 0)).toBe(true);
  });

  it('counts tugs as drag without inflating tends', () => {
    const tug = makeHabit({ id: 'tug', areaId: 'a', polarity: 'ease', tugWeight: 1 });
    const logs = [
      ...lastNDays('h', 'a', 7),
      makeLog({ habitId: 'tug', areaId: 'a', date: isoDaysAgo(1, NOW), loggedAt: MORNING }),
    ];
    const out = computeInsights({ areas: [area], habits: [habit, tug], logs }, 'week', NOW);
    expect(out.summary.tends).toBe(7); // tug not counted as a tend
    expect(out.tugTotals).toEqual([{ area, count: 1 }]);
    expect(out.tugs.some((t) => t.drag > 0)).toBe(true);
  });

  it('reflects partial adherence in an area ratio', () => {
    const logs = lastNDays('h', 'a', 3); // 3 of 7 days
    const out = computeInsights({ areas: [area], habits: [habit], logs }, 'week', NOW);
    expect(out.areas[0].ratio).toBeCloseTo(3 / 7, 5);
    expect(out.summary.topAreaName).toBe('Body');
  });
});
