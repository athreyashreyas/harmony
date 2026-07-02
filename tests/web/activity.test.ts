import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isoDaysAgo } from '@harmony/shared';
import { computeAreaActivity } from '../../apps/web/src/components/Bloom/activity';
import { makeArea, makeHabit, makeLog } from '../fixtures';

// Freeze "now" so the rolling window (and the log dates we build against it) are
// deterministic regardless of when the suite runs.
beforeEach(() => vi.setSystemTime(new Date(2026, 5, 15, 12, 0)));
afterEach(() => vi.useRealTimers());

// `count` distinct in-window completions for a habit, most recent days first.
function completedDays(habitId: string, areaId: string, count: number) {
  return Array.from({ length: count }, (_, i) => makeLog({ habitId, areaId, date: isoDaysAgo(i) }));
}

describe('computeAreaActivity', () => {
  it('is 0 for an area with no tend habits', () => {
    const area = makeArea({ id: 'a', importance: 'matters' });
    expect(computeAreaActivity(area, [], [])).toBe(0);
  });

  it('is 1 when the only habit is fully adhered to (matters, gamma 1)', () => {
    const area = makeArea({ id: 'a', importance: 'matters' });
    const habit = makeHabit({ id: 'h', areaId: 'a', cadence: { kind: 'daily' } });
    const logs = completedDays('h', 'a', 14); // 14 of 14 expected
    expect(computeAreaActivity(area, [habit], logs)).toBeCloseTo(1, 5);
  });

  it('reflects partial adherence linearly for a matters area', () => {
    const area = makeArea({ id: 'a', importance: 'matters' });
    const habit = makeHabit({ id: 'h', areaId: 'a', cadence: { kind: 'daily' } });
    const logs = completedDays('h', 'a', 7); // 7 of 14
    expect(computeAreaActivity(area, [habit], logs)).toBeCloseTo(0.5, 5);
  });

  it('bends fill by importance (core fills slower, optional faster)', () => {
    const habit = (areaId: string) => makeHabit({ id: `h-${areaId}`, areaId, cadence: { kind: 'daily' } });
    const half = (areaId: string) => completedDays(`h-${areaId}`, areaId, 7);

    const core = makeArea({ id: 'core', importance: 'core' });
    const optional = makeArea({ id: 'opt', importance: 'optional' });
    expect(computeAreaActivity(core, [habit('core')], half('core'))).toBeCloseTo(Math.pow(0.5, 1.35), 5);
    expect(computeAreaActivity(optional, [habit('opt')], half('opt'))).toBeCloseTo(Math.pow(0.5, 0.6), 5);
  });

  it('weights habits by their share of the area', () => {
    const area = makeArea({ id: 'a', importance: 'matters' });
    const done = makeHabit({ id: 'done', areaId: 'a', weight: 3, cadence: { kind: 'daily' } });
    const missed = makeHabit({ id: 'missed', areaId: 'a', weight: 1, cadence: { kind: 'daily' } });
    const logs = completedDays('done', 'a', 14); // done fully; missed not at all
    // (3/4)*1 + (1/4)*0 = 0.75
    expect(computeAreaActivity(area, [done, missed], logs)).toBeCloseTo(0.75, 5);
  });

  it('subtracts a tug penalty, floored at zero', () => {
    const area = makeArea({ id: 'a', importance: 'matters' });
    const tend = makeHabit({ id: 'tend', areaId: 'a', cadence: { kind: 'daily' } });
    const tug = makeHabit({ id: 'tug', areaId: 'a', polarity: 'ease', tugWeight: 1 });
    const logs = [
      ...completedDays('tend', 'a', 14), // positive = 1
      makeLog({ habitId: 'tug', areaId: 'a', date: isoDaysAgo(1) }), // one tug -> 0.12 off
    ];
    expect(computeAreaActivity(area, [tend, tug], logs)).toBeCloseTo(0.88, 5);
  });
});
