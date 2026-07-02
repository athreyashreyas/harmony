import { describe, expect, it } from 'vitest';
import { isoDaysAgo } from '@harmony/shared';
import { computeGarden } from '../../apps/web/src/lib/insights/garden';
import { makeArea, makeHabit, makeLog } from '../fixtures';

const NOW = new Date(2026, 5, 15, 12, 0); // 2026-06-15
const area = makeArea({ id: 'a', createdAt: new Date(2026, 5, 1).getTime() }); // created 1 Jun
const habit = makeHabit({ id: 'h', areaId: 'a', cadence: { kind: 'daily' } });
const last7 = Array.from({ length: 7 }, (_, i) => makeLog({ habitId: 'h', areaId: 'a', date: isoDaysAgo(i, NOW) }));

describe('computeGarden', () => {
  it('blooms the current week from recent logs, most recent first', () => {
    const g = computeGarden({ areas: [area], habits: [habit], logs: last7 }, NOW);
    expect(g[0].label).toBe('This week');
    expect(g[0].petals[0].value).toBeGreaterThan(0.9); // a fully-tended week fills the petal
    expect(g.length).toBeGreaterThanOrEqual(2);
    expect(g[0].start > g[1].start).toBe(true); // ordered newest first
  });

  it('labels the previous week and dates the older ones', () => {
    const g = computeGarden({ areas: [area], habits: [habit], logs: last7 }, NOW);
    expect(g[1].label).toBe('Last week');
    if (g[2]) expect(g[2].label).toMatch(/[A-Z][a-z]{2} \d/); // e.g. "Jun 1"
  });

  it('blooms empty for a week with no activity', () => {
    const g = computeGarden({ areas: [area], habits: [habit], logs: [] }, NOW);
    expect(g.every((w) => w.petals.every((p) => p.value === 0))).toBe(true);
  });
});
