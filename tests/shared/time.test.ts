import { describe, expect, it } from 'vitest';
import { daySegment, daysBetween, isoDaysAgo, todayISO } from '@harmony/shared';

describe('todayISO', () => {
  it('formats local Y-M-D with zero padding', () => {
    expect(todayISO(new Date(2026, 2, 5, 13, 0, 0))).toBe('2026-03-05'); // month is 0-based
  });

  it('uses local time, not UTC', () => {
    // Late evening local on the 31st should stay the 31st regardless of UTC.
    expect(todayISO(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
  });
});

describe('isoDaysAgo', () => {
  it('counts back n days from a reference date', () => {
    const from = new Date(2026, 0, 15, 10, 0);
    expect(isoDaysAgo(0, from)).toBe('2026-01-15');
    expect(isoDaysAgo(14, from)).toBe('2026-01-01');
  });

  it('crosses a month boundary', () => {
    expect(isoDaysAgo(1, new Date(2026, 2, 1, 8, 0))).toBe('2026-02-28');
  });
});

describe('daysBetween', () => {
  it('is zero for the same day', () => {
    expect(daysBetween('2026-01-10', '2026-01-10')).toBe(0);
  });

  it('counts forward days', () => {
    expect(daysBetween('2026-01-01', '2026-01-08')).toBe(7);
  });

  it('is negative when the second date is earlier', () => {
    expect(daysBetween('2026-01-08', '2026-01-01')).toBe(-7);
  });

  it('handles a span crossing a DST-style boundary via rounding', () => {
    // Round-trips a full year without drifting off by an hour.
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
  });
});

describe('daySegment', () => {
  it('maps hours to the right segment', () => {
    expect(daySegment(new Date(2026, 0, 1, 2))).toBe('night');
    expect(daySegment(new Date(2026, 0, 1, 8))).toBe('morning');
    expect(daySegment(new Date(2026, 0, 1, 14))).toBe('afternoon');
    expect(daySegment(new Date(2026, 0, 1, 19))).toBe('evening');
    expect(daySegment(new Date(2026, 0, 1, 22))).toBe('night');
  });

  it('uses the documented boundaries', () => {
    expect(daySegment(new Date(2026, 0, 1, 5))).toBe('morning'); // 5:00 -> morning
    expect(daySegment(new Date(2026, 0, 1, 12))).toBe('afternoon'); // 12:00 -> afternoon
    expect(daySegment(new Date(2026, 0, 1, 17))).toBe('evening'); // 17:00 -> evening
    expect(daySegment(new Date(2026, 0, 1, 21))).toBe('night'); // 21:00 -> night
  });
});
