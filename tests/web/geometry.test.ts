import { describe, expect, it } from 'vitest';
import { describeDonutSegment, petalCenter } from '../../apps/web/src/components/Bloom/geometry';

/**
 * The Bloom's petals are annular segments drawn as SVG paths. There is no DOM
 * here to render them into, so what these check is the geometry itself: angles
 * measured from the top going clockwise, the large-arc flag flipping at the
 * half turn, and a path that closes. A petal drawn the wrong way round or with
 * the flag inverted renders as the complement of itself — a full ring with a
 * notch out of it — which is instantly obvious on screen and impossible to
 * catch anywhere else.
 */
const CX = 100;
const CY = 100;

/**
 * The endpoint of each command in the path, in order. Not a regex over every
 * pair of numbers: an arc carries five parameters before its endpoint, and
 * reading those as coordinates is exactly the mistake that makes a geometry
 * test pass while proving nothing.
 */
function points(path: string): { x: number; y: number }[] {
  const tokens = path.split(' ');
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const command = tokens[i];
    // M and L take two numbers; A takes seven, the last two being the endpoint.
    const skip = command === 'M' || command === 'L' ? 0 : command === 'A' ? 5 : null;
    if (skip == null) continue;
    const x = Number(tokens[i + 1 + skip]);
    const y = Number(tokens[i + 2 + skip]);
    out.push({ x, y });
    i += 2 + skip;
  }
  return out;
}

const distanceFromCentre = (p: { x: number; y: number }) => Math.hypot(p.x - CX, p.y - CY);

describe('describeDonutSegment', () => {
  it('opens with a move, closes the path, and uses two arcs', () => {
    const path = describeDonutSegment(CX, CY, 40, 60, 0, 90);
    expect(path.startsWith('M ')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect(path.match(/ A /g)).toHaveLength(2);
    expect(path).toContain(' L ');
  });

  it('keeps every point on one of the two radii', () => {
    const path = describeDonutSegment(CX, CY, 40, 60, 30, 150);
    for (const p of points(path)) {
      const r = distanceFromCentre(p);
      expect(Math.min(Math.abs(r - 40), Math.abs(r - 60))).toBeLessThan(1e-6);
    }
  });

  it('measures angles from the top, going clockwise', () => {
    // 0 degrees is straight up; 90 is to the right.
    const top = describeDonutSegment(CX, CY, 40, 60, 0, 0.0001);
    const first = points(top)[0];
    expect(first.x).toBeCloseTo(CX, 3);
    expect(first.y).toBeCloseTo(CY - 60, 3);

    const right = points(describeDonutSegment(CX, CY, 40, 60, 90, 90.0001))[0];
    expect(right.x).toBeCloseTo(CX + 60, 3);
    expect(right.y).toBeCloseTo(CY, 3);
  });

  it('leaves the large-arc flag off up to a half turn and sets it after', () => {
    // Getting this backwards renders the petal as everything except itself.
    expect(describeDonutSegment(CX, CY, 40, 60, 0, 90)).toMatch(/A 60 60 0 0 0/);
    expect(describeDonutSegment(CX, CY, 40, 60, 0, 180)).toMatch(/A 60 60 0 0 0/);
    expect(describeDonutSegment(CX, CY, 40, 60, 0, 181)).toMatch(/A 60 60 0 1 0/);
  });

  it('sweeps the outer arc one way and the inner arc back the other', () => {
    // The two sweep flags must differ, or the path crosses itself.
    const path = describeDonutSegment(CX, CY, 40, 60, 20, 140);
    const arcs = [...path.matchAll(/A [\d.]+ [\d.]+ 0 (\d) (\d)/g)].map((m) => m[2]);
    expect(arcs).toEqual(['0', '1']);
  });

  it('starts at the far end of the outer arc and returns along the inner one', () => {
    const path = describeDonutSegment(CX, CY, 40, 60, 0, 90);
    const [outerStart, outerEnd, innerStart, innerEnd] = points(path);
    expect(distanceFromCentre(outerStart)).toBeCloseTo(60, 6);
    expect(distanceFromCentre(outerEnd)).toBeCloseTo(60, 6);
    expect(distanceFromCentre(innerStart)).toBeCloseTo(40, 6);
    expect(distanceFromCentre(innerEnd)).toBeCloseTo(40, 6);
    // The inner return ends under the outer start, closing the segment.
    expect(Math.atan2(innerEnd.y - CY, innerEnd.x - CX)).toBeCloseTo(
      Math.atan2(outerStart.y - CY, outerStart.x - CX),
      6
    );
  });

  it('draws each of six equal petals without overlap or gap', () => {
    // The Bloom's real case: six areas, sixty degrees each.
    const starts = Array.from({ length: 6 }, (_, i) => i * 60);
    for (const start of starts) {
      const path = describeDonutSegment(CX, CY, 40, 60, start, start + 60);
      const [outerStart] = points(path);
      // A petal's leading edge is exactly the previous petal's trailing edge.
      const previous = points(describeDonutSegment(CX, CY, 40, 60, start - 60, start))[1];
      expect(Math.hypot(outerStart.x - previous.x, outerStart.y - previous.y)).toBeGreaterThan(0);
    }
  });

  it('handles a petal that has not grown at all', () => {
    // A zero-width segment still has to be a valid path, not NaN.
    const path = describeDonutSegment(CX, CY, 40, 60, 45, 45);
    expect(path).not.toContain('NaN');
    for (const p of points(path)) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it('handles a petal that has grown to the full ring', () => {
    const path = describeDonutSegment(CX, CY, 40, 60, 0, 359.9);
    expect(path).toMatch(/A 60 60 0 1 0/);
    expect(path).not.toContain('NaN');
  });

  it('produces no NaN for any centre, radius or angle it will be given', () => {
    for (const [inner, outer] of [[0, 60], [40, 60], [59, 60]] as const) {
      for (let start = 0; start < 360; start += 37) {
        const path = describeDonutSegment(CX, CY, inner, outer, start, start + 45);
        expect(path).not.toContain('NaN');
      }
    }
  });
});

describe('petalCenter', () => {
  it('sits on the bisector of the segment, at the radius given', () => {
    const centre = petalCenter(CX, CY, 50, 0, 90);
    expect(distanceFromCentre(centre)).toBeCloseTo(50, 6);
    // Halfway between up and right is up-and-to-the-right, at 45 degrees.
    expect(centre.x).toBeCloseTo(CX + 50 * Math.SQRT1_2, 6);
    expect(centre.y).toBeCloseTo(CY - 50 * Math.SQRT1_2, 6);
  });

  it('is straight up for a petal centred on the top', () => {
    const centre = petalCenter(CX, CY, 50, -30, 30);
    expect(centre.x).toBeCloseTo(CX, 6);
    expect(centre.y).toBeCloseTo(CY - 50, 6);
  });

  it('places each of six petals labels evenly around the ring', () => {
    const centres = Array.from({ length: 6 }, (_, i) => petalCenter(CX, CY, 50, i * 60, i * 60 + 60));
    for (const c of centres) expect(distanceFromCentre(c)).toBeCloseTo(50, 6);
    // Six distinct positions, none doubled up.
    const keys = centres.map((c) => `${c.x.toFixed(3)},${c.y.toFixed(3)}`);
    expect(new Set(keys).size).toBe(6);
  });

  it('collapses to a point on the circle for a zero-width petal', () => {
    const centre = petalCenter(CX, CY, 50, 45, 45);
    expect(distanceFromCentre(centre)).toBeCloseTo(50, 6);
  });
});
