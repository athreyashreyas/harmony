import { describe, expect, it } from 'vitest';
import { expectedCompletionsInWindow, isHabitDueOn } from '@harmony/shared';
import { makeHabit } from '../fixtures';

// 2026-01-05 is a Monday; 2026-01-10 a Saturday; 2026-01-11 a Sunday.
const MON = '2026-01-05';
const SAT = '2026-01-10';
const SUN = '2026-01-11';

describe('isHabitDueOn — gating', () => {
  it('is never due when archived', () => {
    expect(isHabitDueOn(makeHabit({ archivedAt: Date.now() }), MON)).toBe(false);
  });

  it('is never due for a tug (ease habit)', () => {
    expect(isHabitDueOn(makeHabit({ polarity: 'ease' }), MON)).toBe(false);
  });

  it('is not due before its start date', () => {
    expect(isHabitDueOn(makeHabit({ startDate: '2026-01-06' }), MON)).toBe(false);
  });

  it('is not due after its end date', () => {
    expect(isHabitDueOn(makeHabit({ startDate: '2026-01-01', endDate: '2026-01-04' }), MON)).toBe(false);
  });

  it('is due on the start date itself', () => {
    expect(isHabitDueOn(makeHabit({ startDate: MON }), MON)).toBe(true);
  });
});

describe('isHabitDueOn — cadences', () => {
  it('daily is due every day', () => {
    const h = makeHabit({ cadence: { kind: 'daily' } });
    expect(isHabitDueOn(h, MON)).toBe(true);
    expect(isHabitDueOn(h, SAT)).toBe(true);
  });

  it('weekdays excludes the weekend', () => {
    const h = makeHabit({ cadence: { kind: 'weekdays' } });
    expect(isHabitDueOn(h, MON)).toBe(true);
    expect(isHabitDueOn(h, SAT)).toBe(false);
    expect(isHabitDueOn(h, SUN)).toBe(false);
  });

  it('weekends is only Saturday and Sunday', () => {
    const h = makeHabit({ cadence: { kind: 'weekends' } });
    expect(isHabitDueOn(h, MON)).toBe(false);
    expect(isHabitDueOn(h, SAT)).toBe(true);
    expect(isHabitDueOn(h, SUN)).toBe(true);
  });

  it('specific-days matches the listed weekday numbers (0=Sun..6=Sat)', () => {
    const h = makeHabit({ cadence: { kind: 'specific-days', days: [1, 3] } }); // Mon, Wed
    expect(isHabitDueOn(h, MON)).toBe(true);
    expect(isHabitDueOn(h, '2026-01-07')).toBe(true); // Wed
    expect(isHabitDueOn(h, '2026-01-06')).toBe(false); // Tue
  });

  it('times-per-week shows every day (the user picks which)', () => {
    const h = makeHabit({ cadence: { kind: 'times-per-week', times: 3 } });
    expect(isHabitDueOn(h, MON)).toBe(true);
    expect(isHabitDueOn(h, SAT)).toBe(true);
  });

  it('every-n-days counts from the start date', () => {
    const h = makeHabit({ startDate: '2026-01-01', cadence: { kind: 'every-n-days', n: 3 } });
    expect(isHabitDueOn(h, '2026-01-01')).toBe(true); // 0 days
    expect(isHabitDueOn(h, '2026-01-02')).toBe(false);
    expect(isHabitDueOn(h, '2026-01-04')).toBe(true); // 3 days
    expect(isHabitDueOn(h, '2026-01-07')).toBe(true); // 6 days
  });

  it('every-n-weeks lands on the same weekday every n weeks', () => {
    const h = makeHabit({ startDate: MON, cadence: { kind: 'every-n-weeks', n: 2 } });
    expect(isHabitDueOn(h, MON)).toBe(true);
    expect(isHabitDueOn(h, '2026-01-12')).toBe(false); // +1 week
    expect(isHabitDueOn(h, '2026-01-19')).toBe(true); // +2 weeks
  });

  it('every-n-months lands on the start day-of-month every n months', () => {
    const h = makeHabit({ startDate: '2026-01-15', cadence: { kind: 'every-n-months', n: 3 } });
    expect(isHabitDueOn(h, '2026-01-15')).toBe(true);
    expect(isHabitDueOn(h, '2026-02-15')).toBe(false); // +1 month
    expect(isHabitDueOn(h, '2026-04-15')).toBe(true); // +3 months
    expect(isHabitDueOn(h, '2026-04-16')).toBe(false); // wrong day
  });

  it('every-n-months clamps the due day to a short month', () => {
    // Start on the 31st; February has no 31st, so it's due on the 28th.
    const h = makeHabit({ startDate: '2026-01-31', cadence: { kind: 'every-n-months', n: 1 } });
    expect(isHabitDueOn(h, '2026-02-28')).toBe(true);
    expect(isHabitDueOn(h, '2026-02-27')).toBe(false);
  });
});

describe('expectedCompletionsInWindow', () => {
  it('daily equals the window length', () => {
    expect(expectedCompletionsInWindow({ kind: 'daily' }, 14)).toBe(14);
  });

  it('weekdays and weekends split the week', () => {
    expect(expectedCompletionsInWindow({ kind: 'weekdays' }, 14)).toBe(10);
    expect(expectedCompletionsInWindow({ kind: 'weekends' }, 14)).toBe(4);
  });

  it('specific-days scales by how many days a week', () => {
    expect(expectedCompletionsInWindow({ kind: 'specific-days', days: [1, 4] }, 14)).toBe(4);
  });

  it('times-per-week scales by the chosen count', () => {
    expect(expectedCompletionsInWindow({ kind: 'times-per-week', times: 3 }, 14)).toBe(6);
  });

  it('every-n-days divides the window', () => {
    expect(expectedCompletionsInWindow({ kind: 'every-n-days', n: 2 }, 14)).toBe(7);
  });

  it('guards against n = 0', () => {
    expect(expectedCompletionsInWindow({ kind: 'every-n-days', n: 0 }, 14)).toBe(14);
  });
});
