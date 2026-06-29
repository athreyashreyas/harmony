import { useEffect } from 'react';

const DEFAULT_THEME_COLOR = '#FBF1E4'; // parchment-100, the app's resting paper

// Temporarily sets the <meta name="theme-color">, which colours the status-bar
// area, while a screen is mounted, and restores the default on leave. Lets a
// screen with a coloured wash (e.g. habit detail) blend the status bar into the
// wash instead of showing a "cropped" strip of plain paper above it.
export function useThemeColor(color: string | null | undefined): void {
  useEffect(() => {
    if (!color) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const previous = meta.getAttribute('content') ?? DEFAULT_THEME_COLOR;
    meta.setAttribute('content', color);
    return () => {
      meta.setAttribute('content', previous);
    };
  }, [color]);
}
