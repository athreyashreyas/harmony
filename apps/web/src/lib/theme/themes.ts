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
    description: 'A golden sunflower on warm sunlit cream. Sunny and unmistakable.',
    bg: '#FFF4D6',
    surface: '#FFFCF2',
    primary: '#F2A900',
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
    id: 'lavender',
    name: 'Lavender',
    description: 'A calm wisteria purple on pale violet paper. Serene and dreamy.',
    bg: '#F1EEFA',
    surface: '#FAF8FF',
    primary: '#7C6BD0',
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    description: 'A deep rose on soft blush paper. Tender and warm.',
    bg: '#FBEEF0',
    surface: '#FFF7F8',
    primary: '#C25072',
  },
  {
    id: 'eggshell',
    name: 'Eggshell',
    description: 'Soft taupe on warm off-white. Clean, quiet, and bright.',
    bg: '#F4F0E6',
    surface: '#FDFBF6',
    primary: '#7C6A4D',
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
  {
    id: 'espresso',
    name: 'Espresso',
    description: 'A warm dark: caramel on deep coffee-brown. Cozy after hours.',
    bg: '#241D17',
    surface: '#322820',
    primary: '#CF9455',
    dark: true,
  },
  {
    id: 'forest-night',
    name: 'Forest Night',
    description: 'A restful green dark: soft moss on deep pine.',
    bg: '#16211A',
    surface: '#1F2E25',
    primary: '#74C084',
    dark: true,
  },
];

export const DEFAULT_THEME_ID = 'terracotta';

export function getTheme(id: string | null | undefined): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
