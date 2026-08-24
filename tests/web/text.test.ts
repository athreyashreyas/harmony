import { describe, expect, it } from 'vitest';
import { countPhrase, joinWithAnd } from '../../apps/web/src/lib/text';

/**
 * Both of these compose user-facing sentences, so what matters is that the
 * result reads as English at every list length rather than leaking a stray
 * comma or a bare "1 times".
 */
describe('joinWithAnd', () => {
  it('joins two with a plain and, no comma', () => {
    expect(joinWithAnd(['Body', 'Mind'])).toBe('Body and Mind');
  });

  it('uses the serial comma from three onwards', () => {
    expect(joinWithAnd(['Body', 'Mind', 'Work'])).toBe('Body, Mind, and Work');
    expect(joinWithAnd(['a', 'b', 'c', 'd'])).toBe('a, b, c, and d');
  });

  it('returns a single item on its own, with nothing added', () => {
    expect(joinWithAnd(['Body'])).toBe('Body');
  });

  it('returns an empty string for an empty list, so callers can test it', () => {
    expect(joinWithAnd([])).toBe('');
  });

  it('never leaves a dangling comma or a doubled and', () => {
    for (let n = 0; n <= 6; n++) {
      const out = joinWithAnd(Array.from({ length: n }, (_, i) => `item${i}`));
      expect(out).not.toMatch(/,\s*$/);
      expect(out).not.toContain('and and');
      expect(out).not.toContain(', and,');
    }
  });

  it('mentions every item it was given, exactly once', () => {
    const items = ['Body', 'Mind', 'Work', 'Home'];
    const out = joinWithAnd(items);
    for (const item of items) expect(out.split(item)).toHaveLength(2);
  });
});

describe('countPhrase', () => {
  it('has words for the small counts rather than digits', () => {
    expect(countPhrase(1)).toBe('once');
    expect(countPhrase(2)).toBe('twice');
  });

  it('falls back to a figure from three onwards', () => {
    expect(countPhrase(3)).toBe('3 times');
    expect(countPhrase(11)).toBe('11 times');
  });

  it('says "not yet" rather than "0 times"', () => {
    // The difference between an encouraging line and a scolding one.
    expect(countPhrase(0)).toBe('not yet');
    expect(countPhrase(-1)).toBe('not yet');
  });

  it('never produces the ungrammatical "1 times"', () => {
    for (let n = -2; n <= 10; n++) {
      expect(countPhrase(n)).not.toBe('1 times');
      expect(countPhrase(n)).not.toBe('2 times');
    }
  });
});
