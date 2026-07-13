import { describe, expect, it } from 'vitest';
import { normalizeToPercents, redistributePercents } from '../../apps/web/src/lib/weights';

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

describe('normalizeToPercents', () => {
  it('turns equal weights into an even split summing to 100', () => {
    const out = normalizeToPercents({ a: 1, b: 1, c: 1 }, ['a', 'b', 'c']);
    expect(sum(out)).toBe(100);
    // 100/3 can't be exact; largest-remainder gives 34/33/33.
    expect(Object.values(out).sort()).toEqual([33, 33, 34]);
  });

  it('preserves proportions of legacy relative weights', () => {
    const out = normalizeToPercents({ a: 5, b: 3, c: 2 }, ['a', 'b', 'c']);
    expect(out).toEqual({ a: 50, b: 30, c: 20 });
    expect(sum(out)).toBe(100);
  });

  it('gives a single habit the whole 100', () => {
    expect(normalizeToPercents({ a: 4 }, ['a'])).toEqual({ a: 100 });
  });

  it('never drops a habit below 1% even from a tiny share', () => {
    const out = normalizeToPercents({ a: 999, b: 1, c: 1 }, ['a', 'b', 'c']);
    expect(sum(out)).toBe(100);
    expect(out.b).toBeGreaterThanOrEqual(1);
    expect(out.c).toBeGreaterThanOrEqual(1);
  });
});

describe('redistributePercents', () => {
  const ids = ['a', 'b', 'c'];

  it('pins the dragged habit and re-apportions the rest, still summing to 100', () => {
    const out = redistributePercents({ a: 34, b: 33, c: 33 }, ids, 'a', 60);
    expect(out.a).toBe(60);
    expect(sum(out)).toBe(100);
    // b and c were equal, so they split the remaining 40 evenly.
    expect(out.b).toBe(20);
    expect(out.c).toBe(20);
  });

  it('allows a habit to be set to exactly 1%, others absorbing the rest', () => {
    const out = redistributePercents({ a: 34, b: 33, c: 33 }, ids, 'a', 1);
    expect(out.a).toBe(1);
    expect(sum(out)).toBe(100);
    expect(out.b + out.c).toBe(99);
  });

  it('clamps so the others never fall below 1% each', () => {
    // 3 habits: the dragged one can reach at most 100 - 2 = 98.
    const out = redistributePercents({ a: 34, b: 33, c: 33 }, ids, 'a', 100);
    expect(out.a).toBe(98);
    expect(out.b).toBe(1);
    expect(out.c).toBe(1);
    expect(sum(out)).toBe(100);
  });

  it('keeps the others in proportion to their prior shares', () => {
    // b:c were 30:10; the freed 60 should split ~45:15.
    const out = redistributePercents({ a: 60, b: 30, c: 10 }, ids, 'a', 40);
    expect(out.a).toBe(40);
    expect(sum(out)).toBe(100);
    expect(out.b).toBe(45);
    expect(out.c).toBe(15);
  });

  it('two habits: one to 1% makes the other 99%', () => {
    const out = redistributePercents({ a: 50, b: 50 }, ['a', 'b'], 'a', 1);
    expect(out).toEqual({ a: 1, b: 99 });
  });
});
