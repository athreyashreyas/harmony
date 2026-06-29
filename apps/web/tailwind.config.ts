import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm paper system (Terracotta + Amber theme). Token names kept so the
        // whole app re-themes without renaming classes.
        parchment: { 50: '#FFFAF1', 100: '#FBF1E4', 200: '#F3E4CF', 300: '#E7D3B4' },
        ink: { 900: '#23190F', 700: '#483A27', 500: '#76654C', 300: '#AB977A', 100: '#DCCCB4' },
        iris: {
          700: '#7A3318',
          600: '#944021',
          500: '#B5532F',
          400: '#C9714A',
          100: '#F6E0CF',
          50: '#FBF0E4',
        }, // brand primary (terracotta)
        rose: { 600: '#A14A5E', 500: '#B85C72', 100: '#F3E2E6' }, // gentle "below" status
        sage: { 600: '#47602A', 500: '#5B7A35', 100: '#EAF0DD' }, // "in a good rhythm" status
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
