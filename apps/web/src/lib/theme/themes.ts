// The theme registry. Each entry pairs an id (which matches a
// :root[data-theme="id"] block in styles/tokens.css) with the bits the UI needs:
// a name, a one-line description, and a few representative colours for the
// settings swatch and the status-bar tint. The colour *values* themselves live
// in tokens.css; this is just the catalogue.
//
// ADDING A THEME: add a block in tokens.css and one entry here. That's it.

export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  /** Resting background (parchment-ground) — also the status-bar tint. */
  bg: string;
  /** Card surface (parchment-surface). */
  surface: string;
  /** Brand accent (accent-base). */
  primary: string;
  /** Hairline/border colour (parchment-edge) — what gives a card its edge. */
  edge: string;
  /** Dark themes flip the swatch text and hint at native dark controls. */
  dark?: boolean;
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'terracotta',
    name: 'Terracotta',
    description: 'Warm and grounding. The original.',
    bg: '#FBF1E4',
    surface: '#FFFAF1',
    primary: '#B5532F',
    edge: '#E7D3B4',
  },
  {
    id: 'mango-sunshine',
    name: 'Mango Sunshine',
    description: 'A golden sunflower on warm sunlit cream. Sunny and unmistakable.',
    bg: '#FFF4D6',
    surface: '#FFFCF2',
    primary: '#F2A900',
    edge: '#F1D78C',
  },
  {
    id: 'sage-grove',
    name: 'Sage Grove',
    description: 'A deep, restful moss green. Calm as a garden.',
    bg: '#E8ECD8',
    surface: '#F6F8EA',
    primary: '#47602A',
    edge: '#C2CBA2',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'A calm wisteria purple on pale violet paper. Serene and dreamy.',
    bg: '#F1EEFA',
    surface: '#FAF8FF',
    primary: '#7C6BD0',
    edge: '#D0C6EA',
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    description: 'A deep rose on soft blush paper. Tender and warm.',
    bg: '#FBEEF0',
    surface: '#FFF7F8',
    primary: '#C25072',
    edge: '#EBC6CE',
  },
  {
    id: 'eggshell',
    name: 'Eggshell',
    description: 'Soft taupe on warm off-white. Clean, quiet, and bright.',
    bg: '#F4F0E6',
    surface: '#FDFBF6',
    primary: '#7C6A4D',
    edge: '#D9D1BD',
  },
  {
    id: 'indigo-night',
    name: 'Indigo Night',
    description: 'Soft lights after dark. Easy on the eyes.',
    bg: '#1B1E2C',
    surface: '#262A3C',
    primary: '#8C7CE0',
    edge: '#3F4459',
    dark: true,
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Banked coals with a live flame. Warm all the way down.',
    bg: '#1A100A',
    surface: '#2C1E16',
    primary: '#E56C4C',
    edge: '#563F2F',
    dark: true,
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Almost no colour at all. Oyster on charcoal.',
    bg: '#100D0B',
    surface: '#201D19',
    primary: '#E4D2B4',
    edge: '#474137',
    dark: true,
  },
  {
    id: 'forest-night',
    name: 'Forest Night',
    description: 'Deep pine and lichen. Restful and green.',
    bg: '#081812',
    surface: '#13281F',
    primary: '#A7CC82',
    edge: '#314C38',
    dark: true,
  },
];

export const DEFAULT_THEME_ID = 'terracotta';

/** Themes that have been retired, mapped to their nearest surviving relative so
 *  a saved preference never silently falls back to a light theme. */
export const RETIRED_THEMES: Record<string, string> = {
  espresso: 'ember',
  // Mapped by nearest surviving ground + accent, so a retired pick lands
  // somewhere recognisable rather than on the light default.
  mulberry: 'graphite',
  tidepool: 'forest-night',
};

/** Normalise any theme id — from localStorage, the synced settings row, or a
 *  URL — to one that still exists. Retired ids map to their replacement rather
 *  than falling through to the default, which would drop a dark-theme user onto
 *  a light theme. Anything unrecognised falls back to the default. */
export function resolveThemeId(id: string | null | undefined): string {
  if (!id) return DEFAULT_THEME_ID;
  if (THEMES.some((t) => t.id === id)) return id;
  return RETIRED_THEMES[id] ?? DEFAULT_THEME_ID;
}

export function getTheme(id: string | null | undefined): ThemeMeta {
  const resolved = resolveThemeId(id);
  return THEMES.find((t) => t.id === resolved) ?? THEMES[0];
}
