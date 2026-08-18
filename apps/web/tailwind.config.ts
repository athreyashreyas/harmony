import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  // Touch devices leave :hover stuck on the last thing tapped, so a hover
  // highlight reads as a stray selection. This wraps every hover: utility in
  // @media (hover: hover) so it only ever applies to a real pointer.
  future: { hoverOnlyWhenSupported: true },
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Colours resolve from CSS variables (styles/tokens.css), as RGB
        // channels so opacity modifiers (bg-accent-base/20) still work. Swapping
        // data-theme on <html> re-themes every utility class.
        //
        // Steps are ROLES, not numbers: a numeric scale inverts incoherently on
        // dark themes (the "50" step stops being the lightest). See tokens.css.
        parchment: {
          ground: 'rgb(var(--parchment-ground-rgb) / <alpha-value>)',
          surface: 'rgb(var(--parchment-surface-rgb) / <alpha-value>)',
          raised: 'rgb(var(--parchment-raised-rgb) / <alpha-value>)',
          edge: 'rgb(var(--parchment-edge-rgb) / <alpha-value>)',
        },
        ink: {
          strong: 'rgb(var(--ink-strong-rgb) / <alpha-value>)',
          body: 'rgb(var(--ink-body-rgb) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted-rgb) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint-rgb) / <alpha-value>)',
        },
        accent: {
          emphasis: 'rgb(var(--accent-emphasis-rgb) / <alpha-value>)',
          base: 'rgb(var(--accent-base-rgb) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft-rgb) / <alpha-value>)',
          wash: 'rgb(var(--accent-wash-rgb) / <alpha-value>)',
          tint: 'rgb(var(--accent-tint-rgb) / <alpha-value>)',
        }, // brand accent, themed
        // Text that sits ON an accent fill (buttons, the bloom heart).
        'on-accent': 'rgb(var(--on-accent-rgb) / <alpha-value>)',
        rose: {
          strong: 'rgb(var(--rose-strong-rgb) / <alpha-value>)',
          base: 'rgb(var(--rose-base-rgb) / <alpha-value>)',
          wash: 'rgb(var(--rose-wash-rgb) / <alpha-value>)',
        }, // gentle "below" status
        sage: {
          strong: 'rgb(var(--sage-strong-rgb) / <alpha-value>)',
          base: 'rgb(var(--sage-base-rgb) / <alpha-value>)',
          wash: 'rgb(var(--sage-wash-rgb) / <alpha-value>)',
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
        // Elevation is themed, not hardcoded. A warm 5%-opacity shadow is
        // invisible on a dark ground, so dark themes swap in an edge ring and
        // an inset highlight instead. The composition lives in tokens.css.
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        sheet: 'var(--shadow-sheet)',
        fab: 'var(--shadow-fab)',
        nav: 'var(--shadow-nav)',
        drag: 'var(--shadow-drag)',
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
