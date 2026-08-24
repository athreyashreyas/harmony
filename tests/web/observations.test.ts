import { describe, expect, it } from 'vitest';
import { isoDaysAgo } from '@harmony/shared';
import { gentleObservations } from '../../apps/web/src/lib/insights/observations';
import { whatToDoNext } from '../../apps/web/src/lib/insights/suggestions';
import { makeArea, makeHabit, makeLog } from '../fixtures';

/**
 * Insights speaks about somebody's own week, so what needs guarding is not the
 * phrasing but the bar each line has to clear. An observation that fires on
 * thin evidence reads as the app making things up, and a suggestion is always a
 * CTA to a specific in-app action, never bare advice.
 */
const NOW = new Date(2026, 5, 15, 12, 0); // Monday 15 June 2026

const area = (over = {}) => makeArea({ id: 'a', name: 'Body', ...over });
const habit = (over = {}) => makeHabit({ id: 'h', areaId: 'a', ...over });

/** One log per day, `days` back from `offset` days ago. */
const logRun = (habitId: string, areaId: string, offset: number, days: number, hour = 9) =>
  Array.from({ length: days }, (_, i) =>
    makeLog({
      habitId,
      areaId,
      date: isoDaysAgo(offset + i, NOW),
      loggedAt: new Date(`${isoDaysAgo(offset + i, NOW)}T${String(hour).padStart(2, '0')}:00:00`).getTime(),
    })
  );

describe('gentleObservations', () => {
  it('has nothing to say about an empty account', () => {
    expect(gentleObservations([], [], [], NOW)).toEqual([]);
  });

  it('says nothing at all rather than reaching for something', () => {
    // A rule that does not trigger produces silence, which is the point of the
    // whole "surfaced only when a rule triggers" design.
    expect(gentleObservations([area()], [habit()], [], NOW)).toEqual([]);
  });

  it('never offers more than three', () => {
    const areas = [area(), makeArea({ id: 'b', name: 'Mind' })];
    const habits = [habit(), makeHabit({ id: 'h2', areaId: 'b' })];
    const logs = [
      ...logRun('h', 'a', 0, 7),
      ...logRun('h2', 'b', 0, 7),
      ...logRun('h', 'a', 7, 3),
    ];
    expect(gentleObservations(areas, habits, logs, NOW).length).toBeLessThanOrEqual(3);
  });

  it('notices a week that beat every week of the past month', () => {
    const logs = [
      ...logRun('h', 'a', 0, 6), // 6 days this week
      ...logRun('h', 'a', 7, 2), // 2 the week before
      ...logRun('h', 'a', 14, 1),
    ];
    const said = gentleObservations([area()], [habit()], logs, NOW);
    expect(said.some((s) => /more than any week this past month/.test(s))).toBe(true);
  });

  it('will not call a week a record when there is no month to compare it to', () => {
    // A first week is not a record; there is nothing behind it.
    const said = gentleObservations([area()], [habit()], logRun('h', 'a', 0, 6), NOW);
    expect(said.some((s) => /more than any week/.test(s))).toBe(false);
  });

  it('counts a day once however many times it was tapped', () => {
    const twiceADay = [
      ...logRun('h', 'a', 0, 3),
      ...logRun('h', 'a', 0, 3), // the same three days again
      ...logRun('h', 'a', 7, 1),
      ...logRun('h', 'a', 14, 1),
    ];
    const said = gentleObservations([area()], [habit()], twiceADay, NOW);
    const record = said.find((s) => /more than any week/.test(s));
    // Three days, not six.
    if (record) expect(record).toContain('3 times');
  });

  it('notices an area that has gone quiet, and repeats back the reason given', () => {
    const quiet = area({ importance: 'core', whySentence: 'It keeps me steady.' });
    const logs = logRun('h', 'a', 7, 15); // busy for three weeks, silent this one
    const said = gentleObservations([quiet], [habit()], logs, NOW);
    const line = said.find((s) => /slowed a little this week/.test(s));
    expect(line).toBeTruthy();
    expect(line).toContain('It keeps me steady.');
  });

  it('leaves an optional area alone when it goes quiet', () => {
    // Something marked optional going quiet is not worth a nudge.
    const optional = area({ importance: 'optional' });
    const said = gentleObservations([optional], [habit()], logRun('h', 'a', 7, 15), NOW);
    expect(said.some((s) => /slowed a little/.test(s))).toBe(false);
  });

  it('says nothing about an area with no reason written down', () => {
    // The line is built around quoting the reason back; without one there is
    // nothing to say.
    const noWhy = area({ importance: 'core', whySentence: null });
    const said = gentleObservations([noWhy], [habit()], logRun('h', 'a', 7, 15), NOW);
    expect(said.some((s) => /slowed a little/.test(s))).toBe(false);
  });

  it('will not call an area quiet without enough history to call anything usual', () => {
    const thin = area({ importance: 'core' });
    const said = gentleObservations([thin], [habit()], logRun('h', 'a', 7, 2), NOW);
    expect(said.some((s) => /slowed a little/.test(s))).toBe(false);
  });

  it('notices a habit that has found one day and one time of day', () => {
    // Six of six logs on a Monday morning.
    const mondays = Array.from({ length: 6 }, (_, i) =>
      makeLog({
        habitId: 'h',
        areaId: 'a',
        date: isoDaysAgo(i * 7, NOW),
        loggedAt: new Date(`${isoDaysAgo(i * 7, NOW)}T08:00:00`).getTime(),
      })
    );
    const said = gentleObservations([area()], [habit({ name: 'Walk' })], mondays, NOW);
    const line = said.find((s) => /found its home/.test(s));
    expect(line).toBeTruthy();
    expect(line).toContain('Monday mornings');
    expect(line).toContain('Walk');
  });

  it('pluralises "nights" rather than saying "nights" wrong', () => {
    const nights = Array.from({ length: 6 }, (_, i) =>
      makeLog({
        habitId: 'h',
        areaId: 'a',
        date: isoDaysAgo(i * 7, NOW),
        loggedAt: new Date(`${isoDaysAgo(i * 7, NOW)}T23:00:00`).getTime(),
      })
    );
    const said = gentleObservations([area()], [habit()], nights, NOW);
    const line = said.find((s) => /found its home/.test(s));
    expect(line).toContain('Monday nights');
    expect(line).not.toContain('nights s');
  });

  it('will not claim a rhythm from fewer than five logs', () => {
    const four = Array.from({ length: 4 }, (_, i) =>
      makeLog({ habitId: 'h', areaId: 'a', date: isoDaysAgo(i * 7, NOW) })
    );
    const said = gentleObservations([area()], [habit()], four, NOW);
    expect(said.some((s) => /found its home/.test(s))).toBe(false);
  });

  it('will not claim a rhythm the logs are spread too evenly to support', () => {
    const scattered = Array.from({ length: 14 }, (_, i) =>
      makeLog({ habitId: 'h', areaId: 'a', date: isoDaysAgo(i, NOW) })
    );
    const said = gentleObservations([area()], [habit()], scattered, NOW);
    expect(said.some((s) => /found its home/.test(s))).toBe(false);
  });

  it('leaves archived areas and habits out entirely', () => {
    const archivedArea = area({ archivedAt: Date.parse('2026-06-01T00:00:00Z') });
    const archivedHabit = habit({ archivedAt: Date.parse('2026-06-01T00:00:00Z') });
    const logs = [...logRun('h', 'a', 0, 6), ...logRun('h', 'a', 7, 1)];
    expect(gentleObservations([archivedArea], [habit()], logs, NOW)).toEqual([]);
    expect(gentleObservations([area()], [archivedHabit], logs, NOW)).toEqual([]);
  });

  it('leaves tugs out: observations are about tending', () => {
    const tug = habit({ id: 'tug', polarity: 'ease' });
    const logs = [...logRun('tug', 'a', 0, 6), ...logRun('tug', 'a', 7, 1)];
    expect(gentleObservations([area()], [tug], logs, NOW)).toEqual([]);
  });
});

describe('whatToDoNext', () => {
  it('has nothing to suggest for an empty account', () => {
    expect(whatToDoNext([], [], [])).toEqual([]);
  });

  it('never offers more than two', () => {
    const areas = [area({ importance: 'core' }), makeArea({ id: 'b', importance: 'core' })];
    const habits = [habit(), makeHabit({ id: 'h2', areaId: 'b' })];
    expect(whatToDoNext(areas, habits, logRun('h', 'a', 0, 10)).length).toBeLessThanOrEqual(2);
  });

  it('always names the thing it wants acted on, never gives bare advice', () => {
    const suggestions = whatToDoNext(
      [area({ importance: 'core' })],
      [habit()],
      logRun('h', 'a', 0, 10)
    );
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(s.text.trim().length).toBeGreaterThan(0);
      if (s.kind === 'add-habit') expect(s.areaId).toBeTruthy();
      if (s.kind === 'move-habit') expect(s.habitId).toBeTruthy();
    }
  });

  it('offers a second way into a core area resting on one habit', () => {
    const [suggestion] = whatToDoNext([area({ importance: 'core' })], [habit()], []);
    expect(suggestion).toMatchObject({ kind: 'add-habit', areaId: 'a' });
    expect(suggestion.text).toContain('Body');
  });

  it('offers it for a core area with no habits at all', () => {
    const [suggestion] = whatToDoNext([area({ importance: 'core' })], [], []);
    expect(suggestion).toMatchObject({ kind: 'add-habit', areaId: 'a' });
  });

  it('leaves a core area with two habits alone', () => {
    const suggestions = whatToDoNext(
      [area({ importance: 'core' })],
      [habit(), makeHabit({ id: 'h2', areaId: 'a' })],
      []
    );
    expect(suggestions.some((s) => s.kind === 'add-habit')).toBe(false);
  });

  it('does not nudge an area that was not marked core', () => {
    for (const importance of ['matters', 'optional'] as const) {
      expect(whatToDoNext([area({ importance })], [habit()], [])).toEqual([]);
    }
  });

  it('does not count an archived habit as covering an area', () => {
    const suggestions = whatToDoNext(
      [area({ importance: 'core' })],
      [habit(), makeHabit({ id: 'h2', areaId: 'a', archivedAt: Date.now() })],
      []
    );
    expect(suggestions[0]).toMatchObject({ kind: 'add-habit' });
  });

  it('offers to move a habit to the day it actually happens on', () => {
    // Six of six logs on a Monday.
    const mondays = Array.from({ length: 6 }, (_, i) =>
      makeLog({ habitId: 'h', areaId: 'a', date: isoDaysAgo(i * 7, NOW) })
    );
    const suggestions = whatToDoNext([area()], [habit({ name: 'Walk' })], mondays);
    const move = suggestions.find((s) => s.kind === 'move-habit');
    expect(move).toMatchObject({ kind: 'move-habit', habitId: 'h' });
    expect(move!.text).toContain('Mondays');
    expect(move!.text).toContain('Walk');
  });

  it('will not read a day pattern out of fewer than five logs', () => {
    const four = Array.from({ length: 4 }, (_, i) =>
      makeLog({ habitId: 'h', areaId: 'a', date: isoDaysAgo(i * 7, NOW) })
    );
    expect(whatToDoNext([area()], [habit()], four)).toEqual([]);
  });

  it('will not read a day pattern out of logs spread across the week', () => {
    const spread = Array.from({ length: 14 }, (_, i) =>
      makeLog({ habitId: 'h', areaId: 'a', date: isoDaysAgo(i, NOW) })
    );
    expect(whatToDoNext([area()], [habit()], spread)).toEqual([]);
  });

  it('leaves tugs out here too', () => {
    const tug = habit({ id: 'tug', polarity: 'ease' });
    const mondays = Array.from({ length: 6 }, (_, i) =>
      makeLog({ habitId: 'tug', areaId: 'a', date: isoDaysAgo(i * 7, NOW) })
    );
    expect(whatToDoNext([area()], [tug], mondays)).toEqual([]);
  });
});
