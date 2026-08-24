import { describe, expect, it } from 'vitest';
import {
  CADENCE_OPTIONS,
  TIME_OF_DAY_OPTIONS,
  cadenceKey,
} from '../../apps/web/src/lib/cadenceOptions';
import { expectedCompletionsInWindow, isHabitDueOn } from '@harmony/shared';
import { makeHabit } from '../fixtures';

/**
 * The short list of frequencies the create and edit sheets offer. The full
 * cadence model supports specific days and every-n-days too; the picker
 * deliberately does not. What has to hold is that every option it does offer is
 * a cadence the scheduling engine understands, and that cadenceKey — which the
 * picker uses to decide which row is selected — tells them apart.
 */
describe('CADENCE_OPTIONS', () => {
  it('offers a short list, led by the default', () => {
    expect(CADENCE_OPTIONS.length).toBeLessThanOrEqual(6);
    expect(CADENCE_OPTIONS[0].value).toEqual({ kind: 'times-per-week', times: 3 });
    expect(CADENCE_OPTIONS[0].label).toBe('A few times a week');
  });

  it('gives every option a label and a distinct value', () => {
    for (const option of CADENCE_OPTIONS) {
      expect(option.label.trim().length).toBeGreaterThan(0);
    }
    const keys = CADENCE_OPTIONS.map((o) => cadenceKey(o.value));
    expect(new Set(keys).size).toBe(keys.length);
    const labels = CADENCE_OPTIONS.map((o) => o.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('offers only cadences the scheduling engine actually understands', () => {
    // A picker row the engine cannot schedule would create a habit that is
    // never due, which is silent and near-impossible to notice.
    const monday = '2026-06-15';
    for (const option of CADENCE_OPTIONS) {
      const habit = makeHabit({ cadence: option.value, startDate: '2026-01-01' });
      expect(() => isHabitDueOn(habit, monday)).not.toThrow();
      expect(typeof isHabitDueOn(habit, monday)).toBe('boolean');
    }
  });

  it('sets an expectation that matches what each row promises', () => {
    // The Bloom measures a petal against expectedCompletionsInWindow, so a
    // label that says "once a week" while the engine expects seven would make
    // the petal read as permanently unfilled.
    const expected = (label: string) =>
      expectedCompletionsInWindow(
        CADENCE_OPTIONS.find((o) => o.label === label)!.value,
        14
      );
    expect(expected('Every day')).toBe(14);
    expect(expected('Once a week')).toBe(2);
    expect(expected('A few times a week')).toBe(6);
    expect(expected('Weekdays')).toBe(10);
    expect(expected('Weekends')).toBe(4);
  });

  it('offers a genuinely different schedule in each row', () => {
    // Two rows that come due on the same days are one row with two names.
    const week = ['2026-06-14', '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20'];
    const shapes = CADENCE_OPTIONS.map((o) => {
      const habit = makeHabit({ cadence: o.value, startDate: '2026-01-01' });
      return week.map((d) => (isHabitDueOn(habit, d) ? '1' : '0')).join('');
    });
    // times-per-week rows are flexible rather than day-shaped, so they can
    // coincide; the day-shaped ones must each be their own.
    const daySpecific = CADENCE_OPTIONS.map((o, i) => ({ kind: o.value.kind, shape: shapes[i] }))
      .filter((x) => x.kind !== 'times-per-week')
      .map((x) => x.shape);
    expect(new Set(daySpecific).size).toBe(daySpecific.length);
  });
});

describe('cadenceKey', () => {
  it('folds a simple cadence to its kind', () => {
    expect(cadenceKey({ kind: 'daily' })).toBe('daily');
    expect(cadenceKey({ kind: 'weekdays' })).toBe('weekdays');
    expect(cadenceKey({ kind: 'weekends' })).toBe('weekends');
  });

  it('keeps the count on a times-per-week cadence', () => {
    // Without it, "once a week" and "a few times a week" would be the same row
    // and the picker would highlight both.
    expect(cadenceKey({ kind: 'times-per-week', times: 1 })).toBe('times-per-week:1');
    expect(cadenceKey({ kind: 'times-per-week', times: 3 })).toBe('times-per-week:3');
    expect(cadenceKey({ kind: 'times-per-week', times: 1 })).not.toBe(
      cadenceKey({ kind: 'times-per-week', times: 3 })
    );
  });

  it('is stable, so a re-render does not lose the selection', () => {
    for (const option of CADENCE_OPTIONS) {
      expect(cadenceKey(option.value)).toBe(cadenceKey(option.value));
    }
  });

  it('matches an equal cadence built somewhere else', () => {
    // The sheet compares the saved habit's cadence against the option list by
    // key, and those are two different objects.
    const saved = { kind: 'times-per-week' as const, times: 3 };
    expect(CADENCE_OPTIONS.some((o) => cadenceKey(o.value) === cadenceKey(saved))).toBe(true);
  });
});

describe('TIME_OF_DAY_OPTIONS', () => {
  it('leads with Anytime, which is the default', () => {
    expect(TIME_OF_DAY_OPTIONS[0]).toEqual({ label: 'Anytime', value: 'anytime' });
  });

  it('covers every segment the reminder scheduling knows about', () => {
    expect(TIME_OF_DAY_OPTIONS.map((o) => o.value)).toEqual([
      'anytime',
      'morning',
      'afternoon',
      'evening',
    ]);
  });

  it('gives each option a distinct label and value', () => {
    const values = TIME_OF_DAY_OPTIONS.map((o) => o.value);
    const labels = TIME_OF_DAY_OPTIONS.map((o) => o.label);
    expect(new Set(values).size).toBe(values.length);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
