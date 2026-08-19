import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_ID,
  RETIRED_THEMES,
  THEMES,
  THEME_PAIRS,
  getTheme,
  resolveThemeId,
} from '../../apps/web/src/lib/theme/themes';
import { acceptsRemoteTheme } from '../../apps/web/src/lib/theme/theme';

describe('resolveThemeId', () => {
  it('passes a live theme through untouched', () => {
    for (const t of THEMES) expect(resolveThemeId(t.id)).toBe(t.id);
  });

  it('sends a retired theme to its replacement, not to the default', () => {
    // The point of the map: someone who chose a dark theme must not be dropped
    // onto a light one just because their pick was retired.
    expect(resolveThemeId('espresso')).toBe('ember');
    expect(resolveThemeId('tidepool')).toBe('forest-night');
    expect(resolveThemeId('ocean-blue')).toBe('sage-grove');
    expect(resolveThemeId('rose-quartz')).toBe('barbie-pink');
    expect(resolveThemeId('garnet')).toBe('afterparty');
  });

  it('follows a chain when a replacement is itself later retired', () => {
    // Mulberry was retired into Garnet, and Garnet has since been retired too.
    // A single hop would land on an id that no longer exists.
    expect(resolveThemeId('mulberry')).toBe('afterparty');
    expect(THEMES.some((t) => t.id === resolveThemeId('mulberry'))).toBe(true);
  });

  it('keeps dark users on a dark theme when their pick is retired', () => {
    for (const [dead, replacement] of Object.entries(RETIRED_THEMES)) {
      if (['espresso', 'mulberry', 'tidepool', 'garnet'].includes(dead)) {
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

describe('acceptsRemoteTheme', () => {
  const LONG_AGO = 60_000;

  it('applies a genuine change from another device', () => {
    expect(acceptsRemoteTheme('graphite', 'terracotta', LONG_AGO)).toBe(true);
  });

  it('ignores an echo of what is already showing', () => {
    // The caller resolves first, so a row still naming a retired theme compares
    // equal to the live theme it maps to and does not re-apply on every sync.
    expect(acceptsRemoteTheme('ember', 'ember', LONG_AGO)).toBe(false);
    expect(acceptsRemoteTheme(resolveThemeId('espresso'), 'ember', LONG_AGO)).toBe(false);
  });

  it('lets a local tap outrank a late echo of an older choice', () => {
    // Rapid tapping means echoes can land out of order and after the fact.
    expect(acceptsRemoteTheme('lantern', 'graphite', 0)).toBe(false);
    expect(acceptsRemoteTheme('lantern', 'graphite', 100)).toBe(false);
    expect(acceptsRemoteTheme('lantern', 'graphite', 3999, 4000)).toBe(false);
  });

  it('accepts remote changes again once the local window has passed', () => {
    expect(acceptsRemoteTheme('lantern', 'graphite', 4000, 4000)).toBe(true);
  });

  it('ignores an empty or missing id', () => {
    expect(acceptsRemoteTheme(null, 'terracotta', LONG_AGO)).toBe(false);
    expect(acceptsRemoteTheme('', 'terracotta', LONG_AGO)).toBe(false);
  });
});
