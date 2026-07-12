import { describe, expect, it } from 'vitest';
import {
  CELEBRATION_COOLDOWN_MS,
  decideCelebrations,
  isMaxed,
  isWholeBloom,
  type CelebrationRecord,
} from '../../apps/web/src/lib/celebrate/celebration';

const bloom = (entries: Record<string, number>) => new Map(Object.entries(entries));

const NOW = new Date('2026-07-12T12:00:00Z').getTime();

function decide(
  prev: Record<string, number>,
  current: Record<string, number>,
  records: CelebrationRecord = {},
  now = NOW,
) {
  return decideCelebrations({
    prev: new Map(Object.entries(prev)),
    current: new Map(Object.entries(current)),
    records,
    now,
  });
}

describe('isMaxed', () => {
  it('treats essentially-full as maxed, absorbing gamma float drift', () => {
    expect(isMaxed(1)).toBe(true);
    expect(isMaxed(0.9995)).toBe(true);
    expect(isMaxed(0.98)).toBe(false);
  });
});

describe('decideCelebrations', () => {
  it('celebrates when a section crosses into full bloom', () => {
    const { celebrate, records } = decide({ a: 0.6 }, { a: 1 });
    expect(celebrate).toEqual(['a']);
    expect(records.a).toBe(NOW);
  });

  it('does not celebrate a section already full on first sight (cold load)', () => {
    // No prev entry = first sight this session; never a crossing.
    const { celebrate } = decide({}, { a: 1 });
    expect(celebrate).toEqual([]);
  });

  it('does not re-celebrate a section that stays full (no crossing)', () => {
    const { celebrate } = decide({ a: 1 }, { a: 1 }, { a: NOW - 1000 });
    expect(celebrate).toEqual([]);
  });

  it('stays quiet on a quick dip-and-recover within the cooldown', () => {
    // Celebrated an hour ago, dipped, now full again: a real crossing, but too
    // soon — a one-day blip is not a fresh achievement.
    const records = { a: NOW - 60 * 60 * 1000 };
    const { celebrate } = decide({ a: 0.5 }, { a: 1 }, records);
    expect(celebrate).toEqual([]);
  });

  it('celebrates again once full bloom is re-earned after the cooldown', () => {
    const records = { a: NOW - CELEBRATION_COOLDOWN_MS - 1 };
    const { celebrate, records: next } = decide({ a: 0.4 }, { a: 1 }, records);
    expect(celebrate).toEqual(['a']);
    expect(next.a).toBe(NOW);
  });

  it('judges each section independently', () => {
    // a stays full (no crossing); b crosses now and should fire on its own.
    const { celebrate } = decide({ a: 1, b: 0.3 }, { a: 1, b: 1 });
    expect(celebrate).toEqual(['b']);
  });

  it('celebrates multiple sections that cross together', () => {
    const { celebrate } = decide({ a: 0.7, b: 0.7 }, { a: 1, b: 1 });
    expect(celebrate.sort()).toEqual(['a', 'b']);
  });

  it('does not mutate the passed-in records when nothing celebrates', () => {
    const records = { a: NOW };
    const { celebrate, records: next } = decide({ a: 1 }, { a: 1 }, records);
    expect(celebrate).toEqual([]);
    expect(next).toBe(records);
  });
});

describe('isWholeBloom', () => {
  it('is true when every section is full and there is more than one', () => {
    expect(isWholeBloom(bloom({ a: 1, b: 1, c: 0.9995 }))).toBe(true);
  });

  it('is false when any section is short of full', () => {
    expect(isWholeBloom(bloom({ a: 1, b: 0.8 }))).toBe(false);
  });

  it('is strict: an empty (unbloomable) section at 0 blocks it', () => {
    // An area with no tend habits reads as 0 and must not be quietly ignored.
    expect(isWholeBloom(bloom({ a: 1, b: 1, empty: 0 }))).toBe(false);
  });

  it('is false for a lone full section (not "the whole life")', () => {
    expect(isWholeBloom(bloom({ a: 1 }))).toBe(false);
  });

  it('is false for an empty wheel', () => {
    expect(isWholeBloom(bloom({}))).toBe(false);
  });
});
