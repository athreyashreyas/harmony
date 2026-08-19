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
  /** The id of this theme's opposite number. Every theme has exactly one: each
   *  dark answers its light partner's accent hue, so the two are the same
   *  colour idea at two times of day. */
  pairedWith: string;
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
    pairedWith: 'ember',
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Terracotta banked down to coals.',
    bg: '#1A1009',
    surface: '#2C1E14',
    primary: '#DD6D45',
    edge: '#55402C',
    dark: true,
    pairedWith: 'terracotta',
  },
  {
    id: 'mango-sunshine',
    name: 'Mango Sunshine',
    description: 'A golden sunflower on warm sunlit cream. Sunny and unmistakable.',
    bg: '#FFF4D6',
    surface: '#FFFCF2',
    primary: '#F2A900',
    edge: '#F1D78C',
    pairedWith: 'lantern',
  },
  {
    id: 'lantern',
    name: 'Lantern',
    description: 'Mango’s gold, in a warm lit room.',
    bg: '#2A2208',
    surface: '#3B3011',
    primary: '#FDB01C',
    edge: '#614E25',
    dark: true,
    pairedWith: 'mango-sunshine',
  },
  {
    id: 'sage-grove',
    name: 'Sage Grove',
    description: 'A deep, restful moss green. Calm as a garden.',
    bg: '#E8ECD8',
    surface: '#F6F8EA',
    primary: '#47602A',
    edge: '#C2CBA2',
    pairedWith: 'forest-night',
  },
  {
    id: 'forest-night',
    name: 'Forest Night',
    description: 'Sage Grove after sundown.',
    bg: '#081812',
    surface: '#13281F',
    primary: '#A7CC82',
    edge: '#314C38',
    dark: true,
    pairedWith: 'sage-grove',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'A calm wisteria purple on pale violet paper. Serene and dreamy.',
    bg: '#F1EEFA',
    surface: '#FAF8FF',
    primary: '#7C6BD0',
    edge: '#D0C6EA',
    pairedWith: 'indigo-night',
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
    pairedWith: 'lavender',
  },
  {
    id: 'barbie-pink',
    name: 'Barbie Pink',
    description: 'Mattel magenta on paper that is never white.',
    bg: '#FFE5F0',
    surface: '#FFF0F6',
    primary: '#CB0078',
    edge: '#FFB5DA',
    pairedWith: 'afterparty',
  },
  {
    id: 'afterparty',
    name: 'Afterparty',
    description: 'The same magenta, lit from a plum-black room.',
    bg: '#220817',
    surface: '#341527',
    primary: '#EF4799',
    edge: '#5C334D',
    dark: true,
    pairedWith: 'barbie-pink',
  },
  {
    id: 'eggshell',
    name: 'Eggshell',
    description: 'Soft taupe on warm off-white. Clean, quiet, and bright.',
    bg: '#F4F0E6',
    surface: '#FDFBF6',
    primary: '#7C6A4D',
    edge: '#D9D1BD',
    pairedWith: 'graphite',
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Eggshell with the lights off.',
    bg: '#100D0B',
    surface: '#201D19',
    primary: '#E4D2B4',
    edge: '#474137',
    dark: true,
    pairedWith: 'eggshell',
  },
];

/** The themes as light/dark couples, in picker order. Derived rather than
 *  hand-listed so it cannot drift out of step with THEMES. */
export const THEME_PAIRS: Array<{ light: ThemeMeta; dark: ThemeMeta }> = THEMES
  .filter((t) => !t.dark)
  .map((light) => ({
    light,
    dark: THEMES.find((t) => t.id === light.pairedWith) as ThemeMeta,
  }));

export const DEFAULT_THEME_ID = 'terracotta';

/** Themes that have been retired, mapped to their nearest surviving relative so
 *  a saved preference never silently falls back to a light theme. */
/** Retired theme ids, mapped to their nearest surviving relative.
 *
 *  Keep entries here forever. A saved preference outlives the theme it names —
 *  it sits in localStorage and in the synced settings row — and without a
 *  mapping it falls through to the light default, which is a jarring place to
 *  land if the retired theme was dark. Mapped by nearest surviving accent hue
 *  and ground, not by name. */
export const RETIRED_THEMES: Record<string, string> = {
  espresso: 'ember',
  mulberry: 'afterparty',
  tidepool: 'forest-night',
  // Removed back in July 2026 with no mapping, so anyone still on it has been
  // landing on Terracotta. Sage Grove is the closest surviving accent hue.
  'ocean-blue': 'sage-grove',
  // Rose Quartz was the same hue as Mattel's magenta at two-thirds the chroma;
  // Barbie Pink replaces it, and Garnet's partner slot goes with it.
  'rose-quartz': 'barbie-pink',
  garnet: 'afterparty',
};

/** Normalise any theme id — from localStorage, the synced settings row, or a
 *  URL — to one that still exists. Retired ids map to their replacement rather
 *  than falling through to the default, which would drop a dark-theme user onto
 *  a light theme. Anything unrecognised falls back to the default. */
export function resolveThemeId(id: string | null | undefined): string {
  if (!id) return DEFAULT_THEME_ID;
  // Follow the chain: a theme can be retired into another that is later retired
  // itself, and a single hop would then land on an id that no longer exists.
  // The bound is a cycle guard, not a real depth — chains are one or two long.
  let current = id;
  for (let hops = 0; hops <= Object.keys(RETIRED_THEMES).length; hops++) {
    if (THEMES.some((t) => t.id === current)) return current;
    const next = RETIRED_THEMES[current];
    if (!next) return DEFAULT_THEME_ID;
    current = next;
  }
  return DEFAULT_THEME_ID;
}

export function getTheme(id: string | null | undefined): ThemeMeta {
  const resolved = resolveThemeId(id);
  return THEMES.find((t) => t.id === resolved) ?? THEMES[0];
}
