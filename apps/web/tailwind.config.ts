import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Colours resolve from CSS variables (styles/tokens.css), as RGB
        // channels so opacity modifiers (bg-iris-500/20) still work. Swapping
        // data-theme on <html> re-themes every utility class. Token names are
        // kept (parchment / ink / iris) so nothing has to be renamed.
        parchment: {
          50: 'rgb(var(--parchment-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--parchment-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--parchment-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--parchment-300-rgb) / <alpha-value>)',
        },
        ink: {
          900: 'rgb(var(--ink-900-rgb) / <alpha-value>)',
          700: 'rgb(var(--ink-700-rgb) / <alpha-value>)',
          500: 'rgb(var(--ink-500-rgb) / <alpha-value>)',
          300: 'rgb(var(--ink-300-rgb) / <alpha-value>)',
          100: 'rgb(var(--ink-100-rgb) / <alpha-value>)',
        },
        iris: {
          700: 'rgb(var(--iris-700-rgb) / <alpha-value>)',
          600: 'rgb(var(--iris-600-rgb) / <alpha-value>)',
          500: 'rgb(var(--iris-500-rgb) / <alpha-value>)',
          400: 'rgb(var(--iris-400-rgb) / <alpha-value>)',
          100: 'rgb(var(--iris-100-rgb) / <alpha-value>)',
          50: 'rgb(var(--iris-50-rgb) / <alpha-value>)',
        }, // brand primary, themed
        // Text that sits on a primary-filled surface (buttons, the bloom heart).
        'on-primary': 'rgb(var(--on-primary-rgb) / <alpha-value>)',
        rose: {
          600: 'rgb(var(--rose-600-rgb) / <alpha-value>)',
          500: 'rgb(var(--rose-500-rgb) / <alpha-value>)',
          100: 'rgb(var(--rose-100-rgb) / <alpha-value>)',
        }, // gentle "below" status
        sage: {
          600: 'rgb(var(--sage-600-rgb) / <alpha-value>)',
          500: 'rgb(var(--sage-500-rgb) / <alpha-value>)',
          100: 'rgb(var(--sage-100-rgb) / <alpha-value>)',
        }, // "in a good rhythm" status
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        sheet: '16px',
        fab: '24px',
      },
      boxShadow: {
        // Warm-tinted shadows to match the paper. The FAB carries a terracotta
        // glow rather than the old violet one.
        card: '0 1px 2px rgba(35, 25, 15, 0.05), 0 1px 3px rgba(35, 25, 15, 0.04)',
        // A touch more lift for floating menus/popovers that sit above the page.
        lift: '0 6px 20px rgba(35, 25, 15, 0.12), 0 2px 6px rgba(35, 25, 15, 0.06)',
        sheet: '0 -4px 24px rgba(35, 25, 15, 0.10)',
        fab: '0 4px 16px rgba(148, 64, 33, 0.28)',
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      // Safe-area utilities mapping to the env() variables (section 5.2).
      addUtilities({
        '.pt-safe': { paddingTop: 'var(--safe-top)' },
        '.pb-safe': { paddingBottom: 'var(--safe-bottom)' },
        '.pl-safe': { paddingLeft: 'var(--safe-left)' },
        '.pr-safe': { paddingRight: 'var(--safe-right)' },
      });
    }),
  ],
} satisfies Config;
