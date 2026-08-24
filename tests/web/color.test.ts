import { describe, expect, it } from 'vitest';
import { blendOver, hexToRgb, hexToRgba } from '../../apps/web/src/lib/color';

describe('hexToRgb', () => {
  it('splits the channels in the right order', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('reads a hex with or without the leading hash', () => {
    expect(hexToRgb('9E343C')).toEqual(hexToRgb('#9E343C'));
  });

  it('expands a three-digit shorthand the way CSS does', () => {
    expect(hexToRgb('#abc')).toEqual(hexToRgb('#aabbcc'));
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('is case-insensitive', () => {
    expect(hexToRgb('#9e343c')).toEqual(hexToRgb('#9E343C'));
  });

  it('reads the area accent colours the app actually stores', () => {
    expect(hexToRgb('#9E343C')).toEqual({ r: 158, g: 52, b: 60 });
  });
});

describe('hexToRgba', () => {
  it('writes a CSS rgba() with the alpha carried through', () => {
    expect(hexToRgba('#9E343C', 0.12)).toBe('rgba(158, 52, 60, 0.12)');
    expect(hexToRgba('#fff', 1)).toBe('rgba(255, 255, 255, 1)');
  });

  it('accepts a fully transparent fill without dropping the channels', () => {
    expect(hexToRgba('#9E343C', 0)).toBe('rgba(158, 52, 60, 0)');
  });
});

describe('blendOver', () => {
  const PAPER = '#FAF8F5';

  it('is the foreground colour at full opacity', () => {
    expect(blendOver('#9E343C', 1, PAPER).toLowerCase()).toBe('#9e343c');
  });

  it('is the background colour at zero opacity', () => {
    expect(blendOver('#9E343C', 0, PAPER).toLowerCase()).toBe('#faf8f5');
  });

  it('lands between the two at a soft opacity, which is what a wash is', () => {
    // This is what tints the status bar to match the top of a watercolour wash.
    const blended = hexToRgb(blendOver('#000000', 0.5, '#FFFFFF'));
    expect(blended.r).toBe(128);
    expect(blended.g).toBe(128);
    expect(blended.b).toBe(128);
  });

  it('always returns a six-digit hex, zero-padded', () => {
    // A channel that lands under 16 must not come back as a five-character
    // string, which the meta tag would read as invalid.
    for (const alpha of [0, 0.03, 0.5, 0.97, 1]) {
      expect(blendOver('#010203', alpha, '#040506')).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('clamps rather than wrapping when an alpha runs out of range', () => {
    // Overshooting must not wrap a channel around to black.
    expect(blendOver('#FFFFFF', 2, '#000000').toLowerCase()).toBe('#ffffff');
    expect(blendOver('#FFFFFF', -1, '#000000').toLowerCase()).toBe('#000000');
  });

  it('moves steadily toward the foreground as the alpha rises', () => {
    const paperLightness = hexToRgb(PAPER).r;
    let previous = paperLightness;
    for (const alpha of [0.1, 0.2, 0.4, 0.8, 1]) {
      const r = hexToRgb(blendOver('#9E343C', alpha, PAPER)).r;
      expect(r).toBeLessThanOrEqual(previous);
      previous = r;
    }
  });

  it('takes shorthand hex on either side', () => {
    expect(blendOver('#000', 0.5, '#fff').toLowerCase()).toBe('#808080');
  });
});
