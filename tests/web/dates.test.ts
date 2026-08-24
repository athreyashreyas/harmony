import { describe, expect, it } from 'vitest';
import {
  endOfMonthISO,
  formatDateMedium,
  formatLongDate,
  formatMonthYear,
  greetingWord,
  lastTendedPhrase,
  monthGrid,
  startOfMonthISO,
  startOfWeekISO,
  weekdayLong,
  weekdayOf,
} from '../../apps/web/src/lib/time/dates';
import { todayISO } from '@harmony/shared';

/**
 * The app-only half of the date layer: the month grid the calendar renders, the
 * weekday bucketing that patterns, observations and suggestions all share, and
 * the greeting. Everything works in local time, and the parse-and-getDay dance
 * lives in exactly one place — these tests are what keep it there.
 */
const local = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h);

describe('weekdayOf', () => {
  it('numbers Sunday 0 through Saturday 6, matching the cadence model', () => {
    // 14 June 2026 is a Sunday.
    expect(weekdayOf('2026-06-14')).toBe(0);
    expect(weekdayOf('2026-06-15')).toBe(1);
    expect(weekdayOf('2026-06-20')).toBe(6);
  });

  it('reads the ISO date locally, not as UTC', () => {
    // A bare Date.parse('2026-06-14') is UTC midnight, which is Saturday the
    // 13th west of Greenwich — and would bucket every log a day early there.
    expect(weekdayOf('2026-06-14')).toBe(local(2026, 6, 14).getDay());
  });

  it('agrees with itself across a month and a year boundary', () => {
    expect(weekdayOf('2026-12-31')).toBe(local(2026, 12, 31).getDay());
    expect(weekdayOf('2027-01-01')).toBe(local(2027, 1, 1).getDay());
  });
});

describe('startOfWeekISO', () => {
  it('walks back to the Sunday that starts the week', () => {
    expect(startOfWeekISO('2026-06-17')).toBe('2026-06-14'); // Wednesday → Sunday
    expect(startOfWeekISO('2026-06-20')).toBe('2026-06-14'); // Saturday → same Sunday
  });

  it('leaves a Sunday where it is', () => {
    expect(startOfWeekISO('2026-06-14')).toBe('2026-06-14');
  });

  it('crosses back into the previous month, and the previous year', () => {
    expect(startOfWeekISO('2026-07-01')).toBe('2026-06-28');
    expect(startOfWeekISO('2027-01-01')).toBe('2026-12-27');
  });

  it('always lands on a Sunday, whatever day it is handed', () => {
    for (let day = 1; day <= 30; day++) {
      const iso = `2026-06-${String(day).padStart(2, '0')}`;
      expect(weekdayOf(startOfWeekISO(iso))).toBe(0);
    }
  });

  it('defaults to the week containing today', () => {
    expect(startOfWeekISO()).toBe(startOfWeekISO(todayISO()));
  });
});

describe('greetingWord', () => {
  it('greets by the segment of the day', () => {
    expect(greetingWord(local(2026, 6, 15, 8))).toBe('Good morning');
    expect(greetingWord(local(2026, 6, 15, 14))).toBe('Good afternoon');
    expect(greetingWord(local(2026, 6, 15, 19))).toBe('Good evening');
  });

  it('says good evening through the small hours rather than good morning', () => {
    // 2am is the end of a long evening, not the start of a morning.
    expect(greetingWord(local(2026, 6, 15, 2))).toBe('Good evening');
    expect(greetingWord(local(2026, 6, 15, 23))).toBe('Good evening');
  });

  it('turns over exactly on the hour boundaries', () => {
    expect(greetingWord(local(2026, 6, 15, 5))).toBe('Good morning');
    expect(greetingWord(local(2026, 6, 15, 11))).toBe('Good morning');
    expect(greetingWord(local(2026, 6, 15, 12))).toBe('Good afternoon');
    expect(greetingWord(local(2026, 6, 15, 16))).toBe('Good afternoon');
    expect(greetingWord(local(2026, 6, 15, 17))).toBe('Good evening');
  });
});

describe('the display formats', () => {
  it('write a weekday with a long month and day', () => {
    expect(formatLongDate(local(2026, 6, 15))).toMatch(/Monday/);
    expect(formatLongDate(local(2026, 6, 15))).toMatch(/15/);
  });

  it('name the weekday of an ISO date', () => {
    expect(weekdayLong('2026-06-15')).toMatch(/Monday/);
    expect(weekdayLong('2026-06-14')).toMatch(/Sunday/);
  });

  it('write a note-thread date from its ISO string', () => {
    const medium = formatDateMedium('2026-06-11');
    expect(medium).toMatch(/Thursday/);
    expect(medium).toMatch(/11/);
  });

  it('write a month with its year, so two Junes never read alike', () => {
    expect(formatMonthYear(local(2026, 6, 15))).toMatch(/2026/);
    expect(formatMonthYear(local(2027, 6, 15))).toMatch(/2027/);
    expect(formatMonthYear(local(2026, 6, 15))).not.toBe(formatMonthYear(local(2027, 6, 15)));
  });
});

describe('lastTendedPhrase', () => {
  it('pairs the day it counted for with the time it was actually tapped', () => {
    // The two can differ: a habit tapped late at night for the day just gone.
    const phrase = lastTendedPhrase('2026-06-15', local(2026, 6, 15, 8).getTime());
    expect(phrase).toMatch(/^Monday morning$/);
  });

  it('takes the segment from the moment, not from the date', () => {
    const late = lastTendedPhrase('2026-06-15', local(2026, 6, 15, 23).getTime());
    expect(late).toBe('Monday night');
  });
});

describe('startOfMonthISO / endOfMonthISO', () => {
  it('bracket the month containing the date', () => {
    expect(startOfMonthISO(local(2026, 6, 17))).toBe('2026-06-01');
    expect(endOfMonthISO(local(2026, 6, 17))).toBe('2026-06-30');
  });

  it('know the short months and a leap February', () => {
    expect(endOfMonthISO(local(2026, 2, 10))).toBe('2026-02-28');
    expect(endOfMonthISO(local(2028, 2, 10))).toBe('2028-02-29');
    expect(endOfMonthISO(local(2026, 12, 10))).toBe('2026-12-31');
  });
});

describe('monthGrid', () => {
  it('lays the month out in full weeks, Sunday first', () => {
    const grid = monthGrid(local(2026, 6, 15));
    for (const row of grid) expect(row).toHaveLength(7);
    const firstDate = grid.flat().find((c) => c != null)!;
    // The first real cell must sit in its own weekday column.
    expect(grid[0].indexOf(firstDate)).toBe(weekdayOf(firstDate));
  });

  it('holds every day of the month, in order, once', () => {
    const grid = monthGrid(local(2026, 6, 15));
    const dates = grid.flat().filter((c): c is string => c != null);
    expect(dates).toHaveLength(30);
    expect(dates[0]).toBe('2026-06-01');
    expect(dates[29]).toBe('2026-06-30');
    expect([...dates].sort()).toEqual(dates);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('pads outside the month with null rather than with neighbouring days', () => {
    const grid = monthGrid(local(2026, 6, 15));
    const dates = grid.flat().filter((c): c is string => c != null);
    for (const date of dates) expect(date.startsWith('2026-06')).toBe(true);
  });

  it('pads the trailing row out so no week is short', () => {
    const grid = monthGrid(local(2026, 6, 15));
    expect(grid.flat().length % 7).toBe(0);
  });

  it('handles a month that opens on a Sunday, with no leading pad', () => {
    // 1 February 2026 is a Sunday.
    const grid = monthGrid(local(2026, 2, 10));
    expect(grid[0][0]).toBe('2026-02-01');
  });

  it('handles a 31-day month that opens on a Saturday, which needs six rows', () => {
    // 1 August 2026 is a Saturday: one cell in the first row, then 30 more.
    const grid = monthGrid(local(2026, 8, 10));
    expect(grid).toHaveLength(6);
    expect(grid[0].filter((c) => c != null)).toEqual(['2026-08-01']);
  });

  it('covers a leap February without dropping the 29th', () => {
    const dates = monthGrid(local(2028, 2, 10))
      .flat()
      .filter((c): c is string => c != null);
    expect(dates).toHaveLength(29);
    expect(dates.at(-1)).toBe('2028-02-29');
  });

  it('lines every date up under its own weekday column', () => {
    for (const month of [1, 2, 5, 8, 11, 12]) {
      for (const row of monthGrid(local(2026, month, 10))) {
        row.forEach((date, column) => {
          if (date != null) expect(weekdayOf(date)).toBe(column);
        });
      }
    }
  });
});
