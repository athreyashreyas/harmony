import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Quiet Paper system, verbatim from section 4.1.
        parchment: { 50: '#FDFCF9', 100: '#FAF9F6', 200: '#F0EDE6', 300: '#E0DCD2' },
        ink: { 900: '#1A1A18', 700: '#3D3D38', 500: '#6B6960', 300: '#9B9890', 100: '#D4D2CB' },
        iris: {
          700: '#3A2870',
          600: '#4A3878',
          500: '#574887',
          400: '#6E5FA0',
          100: '#EDE8F5',
          50: '#F6F3FA',
        }, // primary
        rose: { 600: '#A14A5E', 500: '#B85C72', 100: '#F3E2E6' }, // gentle "below" status
        sage: { 600: '#3D5A3E', 500: '#4F7942', 100: '#E8F0E6' }, // "in a good rhythm" status
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
        // Faint card lift and a softer wide shadow for sheets and the FAB.
        card: '0 1px 2px rgba(26, 26, 24, 0.05), 0 1px 3px rgba(26, 26, 24, 0.04)',
        sheet: '0 -4px 24px rgba(26, 26, 24, 0.10)',
        fab: '0 4px 16px rgba(58, 40, 112, 0.20)',
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
