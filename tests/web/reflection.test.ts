import { describe, expect, it } from 'vitest';
import { isoDaysAgo } from '@harmony/shared';
import { computeInsights } from '../../apps/web/src/lib/insights/analytics';
import { composeReflection } from '../../apps/web/src/lib/insights/reflection';
import { makeArea, makeHabit, makeLog } from '../fixtures';

const NOW = new Date(2026, 5, 15, 12, 0);
const MORNING = new Date(2026, 5, 15, 8, 0).getTime();
const lastNDays = (habitId: string, areaId: string, n: number) =>
  Array.from({ length: n }, (_, i) => makeLog({ habitId, areaId, date: isoDaysAgo(i, NOW), loggedAt: MORNING }));

const area = makeArea({ id: 'a', name: 'Body', importance: 'matters', whySentence: 'It keeps me steady.' });
const habit = makeHabit({ id: 'h', areaId: 'a', name: 'Walk', cadence: { kind: 'daily' } });

describe('composeReflection', () => {
  it('writes a kind, no-shame opener when nothing was logged', () => {
    const insights = computeInsights({ areas: [area], habits: [habit], logs: [] }, 'week', { now: NOW });
    const out = composeReflection(insights, { firstName: 'Sam' });
    expect(out.length).toBeGreaterThan(0);
    expect(out.join(' ').toLowerCase()).toMatch(/okay|no rush|begin|ready/);
  });

  it('celebrates a strong week with accurate numbers and warmth', () => {
    const insights = computeInsights({ areas: [area], habits: [habit], logs: lastNDays('h', 'a', 7) }, 'week', { now: NOW });
    const out = composeReflection(insights, { firstName: 'Sam' });
    const text = out.join(' ');
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(text).toMatch(/7 times|7 days/); // reflects the real counts
    // Warm, encouraging closing (a real pat on the back).
    expect(text.toLowerCase()).toMatch(/credit|keep going|win|game|earned|good to yourself|better/);
  });

  it('is deterministic for the same inputs', () => {
    const insights = computeInsights({ areas: [area], habits: [habit], logs: lastNDays('h', 'a', 5) }, 'week', { now: NOW });
    const a = composeReflection(insights, { firstName: 'Sam' });
    const b = composeReflection(insights, { firstName: 'Sam' });
    expect(a).toEqual(b);
  });

  it('writes a focused reflection about one area', () => {
    const insights = computeInsights({ areas: [area], habits: [habit], logs: lastNDays('h', 'a', 4) }, 'week', { now: NOW, focusAreaId: 'a' });
    const out = composeReflection(insights, { firstName: 'Sam', areaName: 'Body' });
    expect(out.join(' ')).toContain('Body');
  });
});
