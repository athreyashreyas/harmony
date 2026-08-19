import { create } from 'zustand';
import { DEFAULT_THEME_ID, getTheme, resolveThemeId, sideForTime } from './themes';
import { isAfterDark, msUntilNextChange } from './solar';
import { FLAGS } from '../flags';

// Applying a theme is one attribute on <html>; all the colour cascades from the
// CSS variables in styles/tokens.css. The choice is a per-device preference
// (like the notification settings), kept in localStorage so it survives reloads
// and applies before first paint.

const STORAGE_KEY = 'harmony.theme';
/** Coordinates stay on this device. The preference syncs; the location does
 *  not. Only read when FLAGS.sunUsesDeviceLocation is on — which it is not
 *  today, so no location is requested or stored. */
const COORDS_KEY = 'harmony.sunCoords';

/** How long a choice made here outranks an echo of the synced settings row.
 *  Long enough to cover the save debounce and a round trip. */
const LOCAL_WINS_MS = 4000;

let lastLocalChangeAt = 0;

function readStored(): string {
  try {
    return resolveThemeId(localStorage.getItem(STORAGE_KEY));
  } catch {
    // ignore (private mode / disabled storage)
  }
  return DEFAULT_THEME_ID;
}

// localStorage.setItem is synchronous and blocks the main thread. Writing on
// every tap, on top of the style recalculation each theme change already costs,
// is what made tapping quickly through the picker feel like it was queueing up.
// The attribute goes on immediately so the screen answers the touch; the write
// catches up once the tapping stops.
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPersist: string | null = null;

function persistSoon(id: string): void {
  pendingPersist = id;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(flushThemePersist, 150);
}

/** Write any deferred choice out now. Called on the way out of the page so a
 *  tap immediately before a close is never lost. */
export function flushThemePersist(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (pendingPersist === null) return;
  try {
    localStorage.setItem(STORAGE_KEY, pendingPersist);
  } catch {
    // ignore
  }
  pendingPersist = null;
}

export function applyTheme(id: string): void {
  const theme = getTheme(id);
  // Setting data-theme invalidates the computed style of every element on the
  // page, so skip it when nothing would change.
  if (document.documentElement.getAttribute('data-theme') === theme.id) return;
  document.documentElement.setAttribute('data-theme', theme.id);
  // Keep the status-bar tint in step with the theme's resting background.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.bg);
}

/** The policy for whether an id arriving from the synced settings row should be
 *  applied, as a pure function so it can be tested without a DOM.
 *
 *  No, if it is what is already showing — the caller passes resolved ids,
 *  because a row naming a retired theme is never equal to the live theme it
 *  resolves to, and a raw comparison would re-apply on every sync forever.
 *
 *  No, if this device changed theme a moment ago. Echoes can arrive late and
 *  out of order, so without this a stale one lands on top of a fresh choice and
 *  the selection jumps back. A local tap is the more recent intent; it wins. */
export function acceptsRemoteTheme(
  resolvedRemoteId: string | null,
  currentId: string,
  msSinceLocalChange: number,
  localWinsMs: number = LOCAL_WINS_MS,
): boolean {
  if (!resolvedRemoteId) return false;
  if (resolvedRemoteId === currentId) return false;
  return msSinceLocalChange >= localWinsMs;
}

export function shouldAcceptRemoteTheme(id: string | null | undefined): boolean {
  return acceptsRemoteTheme(
    id ? resolveThemeId(id) : null,
    useTheme.getState().themeId,
    Date.now() - lastLocalChangeAt,
  );
}

// Called once, very early (main.tsx), so the saved theme is on <html> before the
// first paint and there is no flash of the default.
export function initTheme(): void {
  applyTheme(readStored());
  window.addEventListener('pagehide', flushThemePersist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushThemePersist();
    else refreshSolarTheme();
  });
}

function readCoords(): { lat: number; lon: number } | null {
  if (!FLAGS.sunUsesDeviceLocation) return null;
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as { lat: number; lon: number };
    return typeof c?.lat === 'number' && typeof c?.lon === 'number' ? c : null;
  } catch {
    return null;
  }
}

function writeCoords(c: { lat: number; lon: number }): void {
  try {
    localStorage.setItem(COORDS_KEY, JSON.stringify(c));
  } catch {
    // ignore
  }
}

/** Ask once, and only when someone turns the toggle on. A refusal is fine —
 *  without coordinates the reference times apply and the feature still works.
 *
 *  Inert while FLAGS.sunUsesDeviceLocation is off, which is the case today:
 *  nothing is asked for and nothing is stored. Kept whole so the capability can
 *  be switched back on, or deleted outright, without archaeology. */
export async function requestSunLocation(): Promise<{ lat: number; lon: number } | null> {
  if (!FLAGS.sunUsesDeviceLocation) return null;
  if (!('geolocation' in navigator)) return null;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 8000,
        maximumAge: 24 * 60 * 60 * 1000,
        enableHighAccuracy: false,
      });
    });
    const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    writeCoords(c);
    return c;
  } catch {
    return null;
  }
}

interface ThemeState {
  /** The couple someone chose. Following the sun never rewrites this. */
  themeId: string;
  /** The half actually on screen. Equal to themeId unless the sun is driving. */
  showingId: string;
  /** A choice made on this device. */
  setTheme: (id: string) => void;
  /** A choice arriving from the synced settings row, which must not count as a
   *  local change or it would suppress the next genuine remote update. */
  setThemeFromSync: (id: string) => void;
  /** Whether the theme follows the sun. Mirrors the synced settings row. */
  followSun: boolean;
  setFollowSun: (on: boolean) => void;
}

let sunTimer: ReturnType<typeof setTimeout> | null = null;
/** Declared before the store, because the store's initialiser assigns to it —
 *  a `let` below would still be in its temporal dead zone and throw on import. */
let repaint: () => void = () => {};

export const useTheme = create<ThemeState>((set, get) => {
  /** Put the right half of the chosen couple on screen, and sleep until the
   *  light next changes rather than polling for it. */
  const paint = () => {
    const { themeId, followSun } = get();
    const coords = readCoords();
    const showing = followSun ? sideForTime(themeId, isAfterDark(new Date(), coords)) : themeId;
    applyTheme(showing);
    if (showing !== get().showingId) set({ showingId: showing });
    if (sunTimer) clearTimeout(sunTimer);
    sunTimer = null;
    if (followSun) sunTimer = setTimeout(paint, msUntilNextChange(new Date(), coords));
  };

  const apply = (id: string, local: boolean) => {
    // Normalise first: this is also the path the synced settings row comes in
    // on, and that row can still hold a retired id from another device.
    const resolved = resolveThemeId(id);
    if (local) lastLocalChangeAt = Date.now();
    if (resolved === get().themeId) return;
    persistSoon(resolved);
    set({ themeId: resolved });
    paint();
  };

  repaint = paint;

  return {
    themeId: readStored(),
    showingId: readStored(),
    followSun: false,
    setTheme: (id) => apply(id, true),
    setThemeFromSync: (id) => apply(id, false),
    setFollowSun: (on) => {
      if (on === get().followSun) return;
      set({ followSun: on });
      paint();
    },
  };
});

/** The screen may have been asleep across a sunset. Catch up on wake. */
export function refreshSolarTheme(): void {
  repaint();
}
