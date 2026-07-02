import { describe, expect, it } from 'vitest';
import type { NudgeHistory } from '@harmony/shared';
import { daysSinceLastLog, detectDrift } from '@harmony/shared';
import { makeArea, makeHabit, makeLog } from '../fixtures';

const NOW = new Date(2026, 1, 1, 12, 0); // 2026-02-01, local noon
const jan = (day: number) => new Date(2026, 0, day).getTime();

function run(over: Partial<Parameters<typeof detectDrift>[0]> = {}) {
  return detectDrift({ areas: [], habits: [], logs: [], nudgeHistory: [], now: NOW, ...over });
}

describe('daysSinceLastLog', () => {
  it('measures from the most recent log', () => {
    const area = makeArea({ id: 'a' });
    const logs = [makeLog({ areaId: 'a', date: '2026-01-25' }), makeLog({ areaId: 'a', date: '2026-01-20' })];
    expect(daysSinceLastLog(area, logs, NOW)).toBe(7); // 25 Jan -> 1 Feb
  });

  it('falls back to the area creation date when never tended', () => {
    const area = makeArea({ id: 'a', createdAt: jan(1) });
    expect(daysSinceLastLog(area, [], NOW)).toBe(31); // 1 Jan -> 1 Feb
  });
});

describe('detectDrift — firing', () => {
  it('fires for a long-quiet "matters" area', () => {
    const area = makeArea({ id: 'a', importance: 'matters', createdAt: jan(1) });
    const out = run({ areas: [area] });
    expect(out.map((c) => c.area.id)).toEqual(['a']);
    expect(out[0].daysSinceLast).toBe(31);
  });

  it('does not fire for a recently tended area', () => {
    const area = makeArea({ id: 'a', importance: 'matters', createdAt: jan(1) });
    const logs = [makeLog({ areaId: 'a', date: '2026-01-31' })];
    expect(run({ areas: [area], logs })).toEqual([]);
  });

  it('never fires for an optional area', () => {
    const area = makeArea({ id: 'a', importance: 'optional', createdAt: jan(1) });
    expect(run({ areas: [area] })).toEqual([]);
  });

  it('skips archived areas', () => {
    const area = makeArea({ id: 'a', importance: 'core', createdAt: jan(1), archivedAt: Date.now() });
    expect(run({ areas: [area] })).toEqual([]);
  });

  it('fires a core area sooner than a matters area at the same silence', () => {
    // Both created 2026-01-20 -> 12 days quiet, no logs, no habits -> cadence 7.
    // core threshold = max(7*1.5, 5) = 10.5; matters = max(7*2, 10) = 14.
    const core = makeArea({ id: 'core', importance: 'core', createdAt: jan(20) });
    const matters = makeArea({ id: 'matters', importance: 'matters', createdAt: jan(20) });
    expect(run({ areas: [core, matters] }).map((c) => c.area.id)).toEqual(['core']);
  });
});

describe('detectDrift — ordering and anti-spam', () => {
  it('ranks core before matters, then by longest silence', () => {
    const core = makeArea({ id: 'core', importance: 'core', createdAt: jan(1) });
    const older = makeArea({ id: 'm-old', importance: 'matters', createdAt: jan(1) });
    const newer = makeArea({ id: 'm-new', importance: 'matters', createdAt: jan(10) });
    const out = run({ areas: [newer, older, core] });
    expect(out.map((c) => c.area.id)).toEqual(['core', 'm-old', 'm-new']);
  });

  it('suppresses an area nudged within the no-repeat window', () => {
    const area = makeArea({ id: 'a', importance: 'matters', createdAt: jan(1) });
    const history: NudgeHistory[] = [
      {
        id: 'n1',
        userId: 'user-1',
        templateId: 'drift-quiet-days', // a real drift template id
        areaId: 'a',
        habitId: null,
        composedText: 'x',
        sentAt: NOW.getTime() - 1 * 86_400_000, // yesterday, inside 3-day window
        channel: 'push',
      },
    ];
    expect(run({ areas: [area], nudgeHistory: history })).toEqual([]);
  });

  it('a non-drift nudge does not suppress drift', () => {
    const area = makeArea({ id: 'a', importance: 'matters', createdAt: jan(1) });
    const history: NudgeHistory[] = [
      {
        id: 'n1',
        userId: 'user-1',
        templateId: 'habit-reminder', // not a drift template
        areaId: 'a',
        habitId: null,
        composedText: 'x',
        sentAt: NOW.getTime() - 1 * 86_400_000,
        channel: 'push',
      },
    ];
    expect(run({ areas: [area], nudgeHistory: history }).map((c) => c.area.id)).toEqual(['a']);
  });
});

describe('detectDrift — tugs do not count as tending', () => {
  it('ignores ease-habit logs when measuring silence', () => {
    const area = makeArea({ id: 'a', importance: 'matters', createdAt: jan(1) });
    const tug = makeHabit({ id: 'tug', areaId: 'a', polarity: 'ease' });
    // A tug logged yesterday must not reset the area's drift clock.
    const logs = [makeLog({ areaId: 'a', habitId: 'tug', date: '2026-01-31' })];
    const out = run({ areas: [area], habits: [tug], logs });
    expect(out.map((c) => c.area.id)).toEqual(['a']);
    expect(out[0].daysSinceLast).toBe(31);
  });
});
