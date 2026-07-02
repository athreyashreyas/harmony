import { describe, expect, it } from 'vitest';
import {
  isDue,
  localDateISO,
  localHHmm,
  minutesOfDay,
  reminderText,
  summaryText,
  withinDnd,
} from '../../apps/push-worker/src/schedule';
import { makeHabit } from '../fixtures';

// A moment in UTC, so 'UTC' formats it verbatim and other zones offset from it.
const at = (h: number, m = 0) => new Date(Date.UTC(2026, 6, 2, h, m)); // 2026-07-02

describe('localHHmm', () => {
  it('formats 24-hour local time in the given zone', () => {
    expect(localHHmm(at(22, 30), 'UTC')).toBe('22:30');
    expect(localHHmm(at(22, 30), 'America/New_York')).toBe('18:30'); // UTC-4 in July
  });

  it('falls back gracefully for a bad timezone', () => {
    expect(localHHmm(at(9, 5), 'Not/AZone')).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('localDateISO', () => {
  it('gives the local calendar date', () => {
    expect(localDateISO(at(22, 30), 'UTC')).toBe('2026-07-02');
  });

  it('rolls to the previous day west of UTC near midnight', () => {
    // 02:30Z on the 3rd is still 22:30 on the 2nd in New York.
    expect(localDateISO(new Date(Date.UTC(2026, 6, 3, 2, 30)), 'America/New_York')).toBe('2026-07-02');
  });
});

describe('withinDnd', () => {
  it('handles a same-day window (start <= end)', () => {
    expect(withinDnd(at(12), 'UTC', '09:00', '17:00')).toBe(true);
    expect(withinDnd(at(8), 'UTC', '09:00', '17:00')).toBe(false);
    expect(withinDnd(at(17), 'UTC', '09:00', '17:00')).toBe(false); // end is exclusive
  });

  it('handles an overnight window that wraps midnight', () => {
    expect(withinDnd(at(22), 'UTC', '21:00', '07:00')).toBe(true);
    expect(withinDnd(at(6), 'UTC', '21:00', '07:00')).toBe(true);
    expect(withinDnd(at(12), 'UTC', '21:00', '07:00')).toBe(false);
    expect(withinDnd(at(7), 'UTC', '21:00', '07:00')).toBe(false); // end is exclusive
  });
});

describe('minutesOfDay', () => {
  it('converts HH:mm to minutes since midnight', () => {
    expect(minutesOfDay('00:00')).toBe(0);
    expect(minutesOfDay('09:30')).toBe(570);
    expect(minutesOfDay('23:59')).toBe(1439);
  });

  it('treats malformed input as 0', () => {
    expect(minutesOfDay('')).toBe(0);
  });
});

describe('isDue', () => {
  it('is due from the target minute through the catch-up window', () => {
    expect(isDue(600, 600, 10)).toBe(true); // exactly on time
    expect(isDue(609, 600, 10)).toBe(true); // 9 min late, still inside
  });

  it('is not due before the target or past the window', () => {
    expect(isDue(599, 600, 10)).toBe(false); // early
    expect(isDue(610, 600, 10)).toBe(false); // window is exclusive at the far end
  });
});

describe('reminderText', () => {
  it('is deterministic for a given seed and mentions the habit', () => {
    const a = reminderText('Walk', 'habit-1:2026-07-02');
    const b = reminderText('Walk', 'habit-1:2026-07-02');
    expect(a).toBe(b);
    expect(a).toContain('Walk');
  });

  it('can vary across days (different seeds)', () => {
    const days = Array.from({ length: 8 }, (_, i) => reminderText('Walk', `h:${i}`));
    expect(new Set(days).size).toBeGreaterThan(1);
  });
});

describe('summaryText', () => {
  it('names a single waiting habit', () => {
    expect(summaryText([makeHabit({ name: 'Walk' })])).toBe('Walk is still waiting today. No rush.');
  });

  it('lists two or three by name', () => {
    const habits = [makeHabit({ name: 'Walk' }), makeHabit({ name: 'Read' })];
    expect(summaryText(habits)).toBe('Still waiting today: Walk, Read.');
  });

  it('counts when there are more than three', () => {
    const habits = ['A', 'B', 'C', 'D', 'E'].map((name) => makeHabit({ name }));
    expect(summaryText(habits)).toBe('5 things are still waiting today. Even one counts.');
  });
});
