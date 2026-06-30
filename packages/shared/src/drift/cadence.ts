import type { Cadence } from '../types';

// Expected gap, in days, between completions for a cadence. Used as the
// fallback cadence for a fresh area with no log history yet (section 16:
// "times-per-week:3 => cadence ~2.3 days").
export function cadenceGapDays(c: Cadence): number {
  switch (c.kind) {
    case 'daily':
      return 1;
    case 'weekdays':
      return 7 / 5;
    case 'weekends':
      return 7 / 2;
    case 'specific-days':
      return c.days.length ? 7 / c.days.length : 7;
    case 'times-per-week':
      return c.times ? 7 / c.times : 7;
    case 'every-n-days':
      return Math.max(1, c.n);
    case 'every-n-weeks':
      return 7 * Math.max(1, c.n);
    case 'every-n-months':
      return 30 * Math.max(1, c.n);
  }
}

export function median(nums: number[]): number | undefined {
  if (nums.length === 0) return undefined;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
