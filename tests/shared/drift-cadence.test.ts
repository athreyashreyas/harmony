import { describe, expect, it } from 'vitest';
import { cadenceGapDays, clamp, median } from '@harmony/shared';

describe('cadenceGapDays', () => {
  it('returns the expected gap between completions', () => {
    expect(cadenceGapDays({ kind: 'daily' })).toBe(1);
    expect(cadenceGapDays({ kind: 'weekdays' })).toBeCloseTo(7 / 5);
    expect(cadenceGapDays({ kind: 'weekends' })).toBeCloseTo(7 / 2);
    expect(cadenceGapDays({ kind: 'specific-days', days: [1, 3, 5] })).toBeCloseTo(7 / 3);
    expect(cadenceGapDays({ kind: 'times-per-week', times: 3 })).toBeCloseTo(7 / 3);
    expect(cadenceGapDays({ kind: 'every-n-days', n: 4 })).toBe(4);
    expect(cadenceGapDays({ kind: 'every-n-weeks', n: 2 })).toBe(14);
    expect(cadenceGapDays({ kind: 'every-n-months', n: 1 })).toBe(30);
  });

  it('falls back to a week for empty specific-days / zero times', () => {
    expect(cadenceGapDays({ kind: 'specific-days', days: [] })).toBe(7);
    expect(cadenceGapDays({ kind: 'times-per-week', times: 0 })).toBe(7);
  });
});

describe('median', () => {
  it('is undefined for an empty list', () => {
    expect(median([])).toBeUndefined();
  });

  it('picks the middle of an odd-length list', () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it('averages the two middle values of an even-length list', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('does not mutate its input', () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe('clamp', () => {
  it('leaves a value inside the range untouched', () => {
    expect(clamp(5, 1, 10)).toBe(5);
  });

  it('clamps below and above', () => {
    expect(clamp(-3, 1, 10)).toBe(1);
    expect(clamp(99, 1, 10)).toBe(10);
  });
});
