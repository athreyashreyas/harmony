import { create } from 'zustand';
import { DEFAULT_THEME_ID, getTheme, THEMES } from './themes';

// Applying a theme is one attribute on <html>; all the colour cascades from the
// CSS variables in styles/tokens.css. The choice is a per-device preference
// (like the notification settings), kept in localStorage so it survives reloads
// and applies before first paint.

const STORAGE_KEY = 'harmony.theme';

function readStored(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && THEMES.some((t) => t.id === v)) return v;
  } catch {
    // ignore (private mode / disabled storage)
  }
  return DEFAULT_THEME_ID;
}

export function applyTheme(id: string): void {
  const theme = getTheme(id);
  document.documentElement.setAttribute('data-theme', theme.id);
  // Keep the status-bar tint in step with the theme's resting background.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.bg);
}

// Called once, very early (main.tsx), so the saved theme is on <html> before the
// first paint and there is no flash of the default.
export function initTheme(): void {
  applyTheme(readStored());
}

interface ThemeState {
  themeId: string;
  setTheme: (id: string) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  themeId: readStored(),
  setTheme: (id) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
    applyTheme(id);
    set({ themeId: id });
  },
}));
