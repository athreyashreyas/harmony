import { create } from 'zustand';
import { DEFAULT_THEME_ID, getTheme, resolveThemeId } from './themes';

// Applying a theme is one attribute on <html>; all the colour cascades from the
// CSS variables in styles/tokens.css. The choice is a per-device preference
// (like the notification settings), kept in localStorage so it survives reloads
// and applies before first paint.

const STORAGE_KEY = 'harmony.theme';

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
  });
}

interface ThemeState {
  themeId: string;
  /** A choice made on this device. */
  setTheme: (id: string) => void;
  /** A choice arriving from the synced settings row, which must not count as a
   *  local change or it would suppress the next genuine remote update. */
  setThemeFromSync: (id: string) => void;
}

export const useTheme = create<ThemeState>((set, get) => {
  const apply = (id: string, local: boolean) => {
    // Normalise first: this is also the path the synced settings row comes in
    // on, and that row can still hold a retired id from another device.
    const resolved = resolveThemeId(id);
    if (local) lastLocalChangeAt = Date.now();
    if (resolved === get().themeId) return;
    applyTheme(resolved);
    persistSoon(resolved);
    set({ themeId: resolved });
  };
  return {
    themeId: readStored(),
    setTheme: (id) => apply(id, true),
    setThemeFromSync: (id) => apply(id, false),
  };
});
