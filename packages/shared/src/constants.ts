// Shared constants. The area accent palette is dyed half a stop deeper than the
// Quiet Paper reference set (section 4.1). Iris doubles as the brand primary.

export interface AreaSwatch {
  name: string;
  hex: string;
}

export const AREA_PALETTE: AreaSwatch[] = [
  { name: 'Sage', hex: '#4A7038' },
  { name: 'Emerald', hex: '#2B7558' },
  { name: 'Teal', hex: '#267A7A' },
  { name: 'Ocean', hex: '#2E6F89' },
  { name: 'Indigo', hex: '#404780' },
  { name: 'Iris', hex: '#574887' },
  { name: 'Plum', hex: '#7A3B6E' },
  { name: 'Rose', hex: '#94405E' },
  { name: 'Crimson', hex: '#9E343C' },
  { name: 'Terracotta', hex: '#9E4E37' },
  { name: 'Amber', hex: '#A86C29' },
  { name: 'Marigold', hex: '#A88820' },
  { name: 'Olive', hex: '#6F7032' },
  { name: 'Graphite', hex: '#404040' },
  { name: 'Storm', hex: '#5A636F' },
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
