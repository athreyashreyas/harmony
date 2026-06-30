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
  /** Resting background (parchment-100) — also the status-bar tint. */
  bg: string;
  /** Card surface (parchment-50). */
  surface: string;
  /** Brand accent (iris-500). */
  primary: string;
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
  },
  {
    id: 'mango-sunshine',
    name: 'Mango Sunshine',
    description: 'A golden sunflower yellow. A little burst of joy on open.',
    bg: '#FFF1C9',
    surface: '#FFFCF0',
    primary: '#F59E00',
  },
  {
    id: 'sage-grove',
    name: 'Sage Grove',
    description: 'A deep, restful moss green. Calm as a garden.',
    bg: '#E8ECD8',
    surface: '#F6F8EA',
    primary: '#47602A',
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'A clear lagoon teal. A deep breath of sea air.',
    bg: '#E2F2F1',
    surface: '#F4FCFB',
    primary: '#1FA0A0',
  },
  {
    id: 'indigo-night',
    name: 'Indigo Night',
    description: 'Soft lights after dark. Easy on the eyes.',
    bg: '#1B1E2C',
    surface: '#262A3C',
    primary: '#8C7CE0',
    dark: true,
  },
];

export const DEFAULT_THEME_ID = 'terracotta';

export function getTheme(id: string | null | undefined): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
