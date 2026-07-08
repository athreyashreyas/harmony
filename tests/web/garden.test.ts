import { describe, expect, it } from 'vitest';
import { isoDaysAgo } from '@harmony/shared';
import { computeGarden } from '../../apps/web/src/lib/insights/garden';
import { startOfWeekISO } from '../../apps/web/src/lib/time/dates';
import { makeArea, makeHabit, makeLog } from '../fixtures';

const NOW = new Date(2026, 5, 15, 12, 0); // 2026-06-15
const area = makeArea({ id: 'a', createdAt: new Date(2026, 5, 1).getTime() }); // created 1 Jun
const habit = makeHabit({ id: 'h', areaId: 'a', cadence: { kind: 'daily' } });
const last7 = Array.from({ length: 7 }, (_, i) => makeLog({ habitId: 'h', areaId: 'a', date: isoDaysAgo(i, NOW) }));

// 7 daily logs spanning exactly one Sun–Sat week, so a "fully tended" fixture
// doesn't spill across a week boundary regardless of what weekday NOW falls on.
function logsForWeek(habitId: string, areaId: string, weekStartISO: string) {
  const base = new Date(`${weekStartISO}T00:00:00`);
  return Array.from({ length: 7 }, (_, i) => makeLog({ habitId, areaId, date: isoDaysAgo(-i, base) }));
}

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

  it('keeps an archived area in the weeks it was alive for, but drops it after', () => {
    // Fully tended two weeks ago, archived last week.
    const archived = makeArea({
      id: 'arch',
      createdAt: new Date(2025, 0, 1).getTime(),
      archivedAt: Date.parse(`${isoDaysAgo(7, NOW)}T00:00:00Z`),
    });
    const archivedHabit = makeHabit({ id: 'h-arch', areaId: 'arch', cadence: { kind: 'daily' }, startDate: '2025-01-01' });
    const twoWeeksAgo = startOfWeekISO(isoDaysAgo(14, NOW));
    const logs = logsForWeek('h-arch', 'arch', twoWeeksAgo);

    const g = computeGarden({ areas: [archived], habits: [archivedHabit], logs }, NOW);
    const weekTwoAgo = g.find((w) => w.start === twoWeeksAgo);
    expect(weekTwoAgo?.petals.some((p) => p.id === 'arch')).toBe(true);
    expect(weekTwoAgo?.petals.find((p) => p.id === 'arch')?.value).toBeGreaterThan(0.9);

    // This week: archived, so it no longer appears at all.
    expect(g[0].petals.some((p) => p.id === 'arch')).toBe(false);
  });

  it('keeps a since-archived habit counted in the weeks it was tended', () => {
    const a = makeArea({ id: 'a2', createdAt: new Date(2025, 0, 1).getTime() });
    const twoWeeksAgo = startOfWeekISO(isoDaysAgo(14, NOW));
    const archivedHabit = makeHabit({
      id: 'h2',
      areaId: 'a2',
      cadence: { kind: 'daily' },
      startDate: '2025-01-01',
      archivedAt: Date.parse(`${isoDaysAgo(1, NOW)}T00:00:00Z`), // archived yesterday
    });
    const logs = logsForWeek('h2', 'a2', twoWeeksAgo);

    const g = computeGarden({ areas: [a], habits: [archivedHabit], logs }, NOW);
    const weekTwoAgo = g.find((w) => w.start === twoWeeksAgo);
    expect(weekTwoAgo?.petals[0].value).toBeGreaterThan(0.9);
  });

  it("doesn't dilute an old week's average with an area created afterwards", () => {
    const old = makeArea({ id: 'old', createdAt: new Date(2025, 0, 1).getTime() });
    const newArea = makeArea({ id: 'new', createdAt: NOW.getTime() }); // created this week
    const oldHabit = makeHabit({ id: 'h-old', areaId: 'old', cadence: { kind: 'daily' }, startDate: '2025-01-01' });
    const twoWeeksAgo = startOfWeekISO(isoDaysAgo(14, NOW));
    const logs = logsForWeek('h-old', 'old', twoWeeksAgo);

    const g = computeGarden({ areas: [old, newArea], habits: [oldHabit], logs }, NOW);
    const weekTwoAgo = g.find((w) => w.start === twoWeeksAgo);
    expect(weekTwoAgo?.petals.some((p) => p.id === 'new')).toBe(false);
    expect(weekTwoAgo?.avg).toBeGreaterThan(0.9);
  });
});
