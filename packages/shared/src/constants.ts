// Shared constants. The area accent palette is dyed half a stop deeper than the
// Quiet Paper reference set (section 4.1). Iris doubles as the brand primary.

// Colour families, in wheel order. Grouping the palette this way lets the
// picker lay colours out as labelled rows of clearly different hues, so a person
// can reach for a contrasting colour (a different family) instead of hunting
// through near-identical shades.
export type ColorFamily =
  | 'Greens'
  | 'Teals'
  | 'Blues'
  | 'Purples'
  | 'Pinks'
  | 'Reds'
  | 'Oranges'
  | 'Yellows'
  | 'Neutrals';

export const COLOR_FAMILIES: ColorFamily[] = [
  'Greens',
  'Teals',
  'Blues',
  'Purples',
  'Pinks',
  'Reds',
  'Oranges',
  'Yellows',
  'Neutrals',
];

export interface AreaSwatch {
  name: string;
  hex: string;
  family: ColorFamily;
}

// A wide palette for colour-coding areas and habits: nine hue families, each
// with a few tones, so there is real range without the wheel collapsing into
// look-alikes. Pigmented, not candy, so every one sits at home on the warm
// paper. Areas and habits draw from the same set.
export const AREA_PALETTE: AreaSwatch[] = [
  // Greens
  { name: 'Lime', hex: '#7BA834', family: 'Greens' },
  { name: 'Fern', hex: '#5E9434', family: 'Greens' },
  { name: 'Sage', hex: '#4A7038', family: 'Greens' },
  { name: 'Moss', hex: '#2F6B3A', family: 'Greens' },
  // Teals
  { name: 'Jade', hex: '#1F9A6D', family: 'Teals' },
  { name: 'Emerald', hex: '#2B7558', family: 'Teals' },
  { name: 'Lagoon', hex: '#2E8C8C', family: 'Teals' },
  { name: 'Teal', hex: '#267A7A', family: 'Teals' },
  // Blues
  { name: 'Sky', hex: '#3A7CA8', family: 'Blues' },
  { name: 'Ocean', hex: '#2E6F89', family: 'Blues' },
  { name: 'Azure', hex: '#2F76D6', family: 'Blues' },
  { name: 'Cobalt', hex: '#3556A8', family: 'Blues' },
  // Purples
  { name: 'Periwinkle', hex: '#6A6FD0', family: 'Purples' },
  { name: 'Indigo', hex: '#404780', family: 'Purples' },
  { name: 'Iris', hex: '#574887', family: 'Purples' },
  { name: 'Violet', hex: '#7A4FB0', family: 'Purples' },
  // Pinks
  { name: 'Lilac', hex: '#9B6FC0', family: 'Pinks' },
  { name: 'Magenta', hex: '#A83C7E', family: 'Pinks' },
  { name: 'Plum', hex: '#7A3B6E', family: 'Pinks' },
  { name: 'Rose', hex: '#94405E', family: 'Pinks' },
  // Reds
  { name: 'Coral', hex: '#D65B4A', family: 'Reds' },
  { name: 'Scarlet', hex: '#C0392B', family: 'Reds' },
  { name: 'Cherry', hex: '#B03050', family: 'Reds' },
  { name: 'Crimson', hex: '#9E343C', family: 'Reds' },
  // Oranges
  { name: 'Tangerine', hex: '#C66A2C', family: 'Oranges' },
  { name: 'Terracotta', hex: '#B5532F', family: 'Oranges' },
  { name: 'Amber', hex: '#A86C29', family: 'Oranges' },
  { name: 'Rust', hex: '#9A4B24', family: 'Oranges' },
  // Yellows
  { name: 'Gold', hex: '#B7902A', family: 'Yellows' },
  { name: 'Marigold', hex: '#A88820', family: 'Yellows' },
  { name: 'Sand', hex: '#B08A4F', family: 'Yellows' },
  { name: 'Olive', hex: '#6F7032', family: 'Yellows' },
  // Neutrals
  { name: 'Storm', hex: '#5A636F', family: 'Neutrals' },
  { name: 'Slate', hex: '#47566A', family: 'Neutrals' },
  { name: 'Stone', hex: '#7A6E63', family: 'Neutrals' },
  { name: 'Graphite', hex: '#404040', family: 'Neutrals' },
];

// Suggested areas of life shown as chips in onboarding screen 2. Each carries a
// default colour from the area palette above. The user can change a colour any
// time, and custom areas pick their own swatch.
export interface SuggestedArea {
  name: string;
  color: string;
}

export const SUGGESTED_AREAS: SuggestedArea[] = [
  { name: 'Body', color: '#9E343C' }, // Crimson
  { name: 'Mind', color: '#404780' }, // Indigo
  { name: 'Creativity', color: '#574887' }, // Iris
  { name: 'Connection', color: '#94405E' }, // Rose
  { name: 'Socialising', color: '#C66A2C' }, // Tangerine
  { name: 'Play', color: '#A88820' }, // Marigold
  { name: 'Spirit', color: '#7A3B6E' }, // Plum
  { name: 'Home', color: '#9E4E37' }, // Terracotta
  { name: 'Work', color: '#5A636F' }, // Storm
  { name: 'Learning', color: '#2E6F89' }, // Ocean
  { name: 'Rest', color: '#267A7A' }, // Teal
  { name: 'Service', color: '#2B7558' }, // Emerald
  { name: 'Place', color: '#4A7038' }, // Sage
];

// Default do-not-disturb window (local time), section 14.
export const DEFAULT_DND = { start: '21:00', end: '07:00' };

// How many areas of life a person may keep. Enforced both in onboarding and in
// the day-to-day Areas screen so the Bloom's petals never shrink past legible.
// A domain rule, so it lives here rather than in any one screen's module.
export const MIN_AREAS = 3;
export const MAX_AREAS = 20;

// Character limits for user-entered text. Names are titles that show in tight
// rows, chips, and petals, so they are kept short; the reflective fields get a
// generous cap and are always shown in full where they live. Enforced at input
// with maxLength, so nothing absurdly long can ever break a layout.
export const MAX_HABIT_NAME = 60;
export const MAX_AREA_NAME = 30;
export const MAX_WHY_SENTENCE = 240;
export const MAX_NOTE = 1000;
