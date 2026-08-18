import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_ID,
  RETIRED_THEMES,
  THEMES,
  THEME_PAIRS,
  getTheme,
  resolveThemeId,
} from '../../apps/web/src/lib/theme/themes';

describe('resolveThemeId', () => {
  it('passes a live theme through untouched', () => {
    for (const t of THEMES) expect(resolveThemeId(t.id)).toBe(t.id);
  });

  it('sends a retired theme to its replacement, not to the default', () => {
    // The point of the map: someone who chose a dark theme must not be dropped
    // onto a light one just because their pick was retired.
    expect(resolveThemeId('espresso')).toBe('ember');
    expect(resolveThemeId('mulberry')).toBe('garnet');
    expect(resolveThemeId('tidepool')).toBe('forest-night');
    expect(resolveThemeId('ocean-blue')).toBe('sage-grove');
  });

  it('keeps dark users on a dark theme when their pick is retired', () => {
    for (const [dead, replacement] of Object.entries(RETIRED_THEMES)) {
      if (['espresso', 'mulberry', 'tidepool'].includes(dead)) {
        expect(getTheme(replacement).dark).toBe(true);
      }
    }
  });

  it('falls back to the default for an unknown or empty id', () => {
    expect(resolveThemeId('not-a-theme')).toBe(DEFAULT_THEME_ID);
    expect(resolveThemeId('')).toBe(DEFAULT_THEME_ID);
    expect(resolveThemeId(null)).toBe(DEFAULT_THEME_ID);
    expect(resolveThemeId(undefined)).toBe(DEFAULT_THEME_ID);
  });

  it('is idempotent, so a sync comparing resolved ids converges', () => {
    for (const id of [...Object.keys(RETIRED_THEMES), 'junk', DEFAULT_THEME_ID]) {
      expect(resolveThemeId(resolveThemeId(id))).toBe(resolveThemeId(id));
    }
  });

  it('never resolves to a theme that does not exist', () => {
    for (const id of [...Object.keys(RETIRED_THEMES), 'junk', null]) {
      expect(THEMES.some((t) => t.id === resolveThemeId(id))).toBe(true);
    }
  });
});

describe('getTheme', () => {
  it('returns a usable theme for a retired id rather than throwing', () => {
    const t = getTheme('espresso');
    expect(t.id).toBe('ember');
    expect(t.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(t.edge).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe('theme pairing', () => {
  it('pairs every theme with exactly one partner, both ways', () => {
    for (const t of THEMES) {
      const partner = THEMES.find((p) => p.id === t.pairedWith);
      expect(partner, `${t.id} has no partner`).toBeDefined();
      expect(partner?.pairedWith).toBe(t.id);
      expect(partner?.dark).not.toBe(t.dark);
    }
  });

  it('gives every light theme a dark counterpart', () => {
    expect(THEME_PAIRS).toHaveLength(THEMES.filter((t) => !t.dark).length);
    for (const { light, dark } of THEME_PAIRS) {
      expect(light.dark).toBeFalsy();
      expect(dark.dark).toBe(true);
    }
  });

  it('every theme carries the swatch colours the picker needs', () => {
    for (const t of THEMES) {
      for (const k of ['bg', 'surface', 'primary', 'edge'] as const) {
        expect(t[k], `${t.id}.${k}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});
