import { describe, expect, it } from 'vitest';
import { isoDaysAgo } from '@harmony/shared';
import { WEEKDAY_NAMES, detectHabitPatterns } from '../../apps/web/src/lib/drift/patterns';
import { makeHabit, makeLog } from '../fixtures';

/**
 * The habit detail patterns. Two rules the whole module is built around, and
 * both are easy to break by accident: an observation is surfaced only above a
 * confidence threshold (so the section stays hidden rather than filling space),
 * and it is always about presence, never absence.
 */
const NOW = new Date(2026, 5, 15, 12, 0); // Monday 15 June 2026
const HABIT = makeHabit({ id: 'h', areaId: 'a', name: 'Walk' });

/** A log on the date `daysAgo` back, tapped at `hour` local. */
const at = (daysAgo: number, hour = 9, habitId = 'h') => {
  const date = isoDaysAgo(daysAgo, NOW);
  return makeLog({
    habitId,
    areaId: 'a',
    date,
    loggedAt: new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime(),
  });
};

/** `count` logs on the same weekday, one a week apart, at `hour`. */
const weekly = (count: number, hour = 9, habitId = 'h', startDaysAgo = 0) =>
  Array.from({ length: count }, (_, i) => at(startDaysAgo + i * 7, hour, habitId));

const patterns = (logs = weekly(6), habits = [HABIT]) =>
  detectHabitPatterns(HABIT, logs, habits, NOW);

describe('detectHabitPatterns', () => {
  it('says nothing about a habit with no history', () => {
    expect(detectHabitPatterns(HABIT, [], [HABIT], NOW)).toEqual([]);
  });

  it('holds the day, time and company patterns below the five-completion floor', () => {
    // Four Mondays is a coincidence, not a rhythm. The streak has its own bar
    // (four of seven weeks) and is allowed to speak here — it is a count of
    // weeks shown up for, not a claim about a pattern.
    const said = patterns(weekly(4));
    expect(said.some((s) => /tends to land on/.test(s))).toBe(false);
    expect(said.some((s) => /find your way to this/.test(s))).toBe(false);
    expect(said.some((s) => /likes company/.test(s))).toBe(false);
    expect(said).toEqual([
      "You've shown up for this in 4 of the last 7 weeks. That kind of steadiness is rare.",
    ]);
  });

  it('says nothing at all with three completions, where no rule clears its bar', () => {
    expect(patterns(weekly(3))).toEqual([]);
  });

  it('never offers more than three', () => {
    const companion = makeHabit({ id: 'h2', areaId: 'a', name: 'Stretch' });
    const logs = [...weekly(6), ...weekly(6, 9, 'h2')];
    expect(patterns(logs, [HABIT, companion]).length).toBeLessThanOrEqual(3);
  });

  it('names the day a habit lands on', () => {
    const said = patterns(weekly(6));
    expect(said.some((s) => s === 'This tends to land on Monday.')).toBe(true);
  });

  it('calls a Saturday-and-Sunday habit a weekend one', () => {
    // 13 and 14 June 2026 are a Saturday and a Sunday.
    const weekends = [at(1), at(2), at(8), at(9), at(15), at(16)];
    const said = patterns(weekends);
    expect(said).toContain('This one tends to belong to your weekends.');
    expect(said.some((s) => /Saturday and Sunday/.test(s))).toBe(false);
  });

  it('names up to three days when the habit spreads across a few', () => {
    // Mon/Wed/Fri, twice over.
    const mwf = [at(0), at(2), at(4), at(7), at(9), at(11)];
    const said = patterns(mwf);
    const day = said.find((s) => /tends to land on/.test(s));
    expect(day).toBeTruthy();
    expect(day).toMatch(/Monday|Wednesday|Friday/);
    expect(day!.split(',').length).toBeLessThanOrEqual(3);
  });

  it('reads the days in calendar order, not in frequency order', () => {
    // Friday twice, Monday twice, Wednesday once and again — the sentence must
    // still read Monday, Wednesday, Friday.
    const mwf = [at(0), at(2), at(4), at(7), at(9), at(11), at(14)];
    const day = patterns(mwf).find((s) => /tends to land on/.test(s));
    if (day && day.includes('Monday') && day.includes('Friday')) {
      expect(day.indexOf('Monday')).toBeLessThan(day.indexOf('Friday'));
    }
  });

  it('says nothing about days when the logs are spread evenly across the week', () => {
    const everyDay = Array.from({ length: 14 }, (_, i) => at(i));
    expect(patterns(everyDay).some((s) => /tends to land on/.test(s))).toBe(false);
  });

  it('names the time of day a habit happens at', () => {
    expect(patterns(weekly(6, 8))).toContain('You usually find your way to this in the morning.');
    expect(patterns(weekly(6, 14))).toContain('You usually find your way to this in the afternoon.');
    expect(patterns(weekly(6, 19))).toContain('You usually find your way to this in the evening.');
  });

  it('words the night case separately, since "in the night" reads wrong', () => {
    expect(patterns(weekly(6, 23))).toContain('You usually find your way to this at night.');
  });

  it('says nothing about time when the taps are scattered through the day', () => {
    const scattered = [at(0, 8), at(7, 14), at(14, 20), at(21, 8), at(28, 14), at(35, 23)];
    expect(patterns(scattered).some((s) => /find your way to this/.test(s))).toBe(false);
  });

  it('notices a habit that travels with another', () => {
    const companion = makeHabit({ id: 'h2', areaId: 'a', name: 'Stretch' });
    const logs = [...weekly(6), ...weekly(6, 9, 'h2')];
    const said = patterns(logs, [HABIT, companion]);
    expect(said).toContain('This one likes company. It often travels with Stretch.');
  });

  it('will not call two coincidences company', () => {
    const companion = makeHabit({ id: 'h2', areaId: 'a', name: 'Stretch' });
    const logs = [...weekly(6), at(0, 9, 'h2'), at(7, 9, 'h2')];
    expect(patterns(logs, [HABIT, companion]).some((s) => /likes company/.test(s))).toBe(false);
  });

  it('does not claim a habit travels with itself', () => {
    expect(patterns(weekly(6)).some((s) => /likes company/.test(s))).toBe(false);
  });

  it('celebrates weeks shown up for, and counts them right', () => {
    const said = patterns(weekly(6));
    const streak = said.find((s) => /shown up for this/.test(s));
    expect(streak).toBe(
      "You've shown up for this in 6 of the last 7 weeks. That kind of steadiness is rare."
    );
  });

  it('will not celebrate a streak below four weeks', () => {
    const three = [at(0), at(7), at(14), at(1), at(8)]; // three distinct weeks
    expect(patterns(three).some((s) => /shown up for this/.test(s))).toBe(false);
  });

  it('counts a week once however many days it holds', () => {
    // Six logs, all in the last week: one week present, not six.
    const oneWeek = [at(0), at(1), at(2), at(3), at(4), at(5)];
    expect(patterns(oneWeek).some((s) => /shown up for this/.test(s))).toBe(false);
  });

  it('speaks only of presence, never of absence', () => {
    // The house rule for this whole section: the app does not tell anybody what
    // they failed to do.
    const cases = [weekly(6), weekly(6, 23), [at(0), at(1), at(8), at(9), at(15), at(16)]];
    for (const logs of cases) {
      for (const line of patterns(logs)) {
        expect(line).not.toMatch(/\b(miss|missed|skip|skipped|fail|failed|haven't|didn't|never)\b/i);
      }
    }
  });

  it('looks only at the last sixty days', () => {
    // A rhythm that ended two months ago is not a current pattern.
    expect(patterns(weekly(6, 9, 'h', 70))).toEqual([]);
  });

  it('counts a day once however many times it was tapped', () => {
    // Five taps on four distinct days is below the floor.
    const fourDays = [at(0), at(0), at(7), at(14), at(21)];
    expect(patterns(fourDays).some((s) => /tends to land on/.test(s))).toBe(false);
  });

  it('ignores logs belonging to other habits when reading this one', () => {
    const other = makeHabit({ id: 'h2', areaId: 'a', name: 'Stretch' });
    const logs = [...weekly(4), ...weekly(20, 9, 'h2')];
    expect(patterns(logs, [HABIT, other]).some((s) => /tends to land on/.test(s))).toBe(false);
  });
});

describe('WEEKDAY_NAMES', () => {
  it('is indexed by getDay(), Sunday first', () => {
    expect(WEEKDAY_NAMES).toHaveLength(7);
    expect(WEEKDAY_NAMES[0]).toBe('Sunday');
    expect(WEEKDAY_NAMES[6]).toBe('Saturday');
  });

  it('agrees with the dates the app actually parses', () => {
    // 14 June 2026 is a Sunday; every other weekday follows from it.
    for (let i = 0; i < 7; i++) {
      const date = new Date(2026, 5, 14 + i);
      expect(WEEKDAY_NAMES[date.getDay()]).toBe(
        date.toLocaleDateString('en-US', { weekday: 'long' })
      );
    }
  });
});
