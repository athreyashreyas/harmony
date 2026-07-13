import { motion } from 'framer-motion';
import type { GuideArtKind } from '../../lib/guide';
import MiniBloom from '../MiniBloom/MiniBloom';

const ASH = '#5a636f';

// Small, calm illustrations so the guide (and the "What's new" cards) instruct
// by showing, not only telling. Shared by GuideScreen and ReleaseRow.
//
// THEME RULE (these render on every theme, light and dark): never assume a light
// background. Use the parchment/ink CSS variables for anything structural (they
// flip per theme), and for colour accents use a *semi-transparent solid* fill
// (hexToRgba(color, ~0.8) or a hex with an opacity attribute), the way MiniBloom
// does. Do NOT use `mixBlendMode: 'multiply'` or any blend mode: multiply turns
// to mud on a dark ground. A quick check: glance at each new art in a dark theme
// (Me -> Appearance -> Indigo Night) before shipping it.
export default function GuideArt({ kind }: { kind: GuideArtKind }) {
  switch (kind) {
    case 'bloom':
      return (
        <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden="true">
          <circle cx="60" cy="60" r="44" fill="none" stroke="var(--parchment-300)" strokeDasharray="2 4" />
          <g>
            <path d="M60 60 L60 18 A42 42 0 0 1 96 39 Z" fill="#b5532f" opacity="0.85" />
            <path d="M60 60 L96 39 A42 42 0 0 1 96 81 Z" fill="#b7902a" opacity="0.5" />
            <path d="M60 60 L96 81 A42 42 0 0 1 60 102 Z" fill="#5b7a35" opacity="0.7" />
            <path d="M60 60 L60 102 A42 42 0 0 1 24 81 Z" fill="#7a3b6e" opacity="0.35" />
            <path d="M60 60 L24 81 A42 42 0 0 1 24 39 Z" fill="#3a7ca8" opacity="0.6" />
            <path d="M60 60 L24 39 A42 42 0 0 1 60 18 Z" fill="#944021" opacity="0.5" />
          </g>
          <circle cx="60" cy="60" r="16" fill="var(--parchment-50)" />
          <text x="60" y="61" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-serif)" fontSize="20" fill="var(--iris-500)">h</text>
        </svg>
      );
    case 'habit':
      return (
        <div className="w-full max-w-[240px] space-y-2">
          <div className="flex items-center gap-3 rounded-card bg-parchment-50 py-3 pl-3 pr-4 shadow-card" style={{ borderLeft: '3px solid #5b7a35' }}>
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full" style={{ backgroundColor: '#5b7a35' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </span>
            <span className="flex-1 text-sm text-ink-300 line-through">Morning walk</span>
          </div>
          <div className="flex items-center gap-3 rounded-card bg-parchment-50 py-3 pl-3 pr-4 shadow-card" style={{ borderLeft: '3px solid #944021' }}>
            <span className="h-[22px] w-[22px] rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px var(--parchment-300)' }} />
            <span className="flex-1 text-sm text-ink-900">Read a few pages</span>
          </div>
        </div>
      );
    case 'areas':
      return (
        <div className="flex flex-wrap justify-center gap-2">
          {[
            ['Body', '#9E343C'],
            ['Mind', '#404780'],
            ['Connection', '#94405E'],
          ].map(([name, c]) => (
            <span key={name} className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium" style={{ backgroundColor: `${c}1f`, color: c }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
              {name}
            </span>
          ))}
        </div>
      );
    case 'weights':
      return (
        <div className="w-full max-w-[240px]">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-parchment-200">
            <span style={{ width: '55%', backgroundColor: '#b5532f' }} />
            <span style={{ width: '30%', backgroundColor: '#b7902a' }} />
            <span style={{ width: '15%', backgroundColor: '#5b7a35' }} />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-ink-300">
            <span>55%</span>
            <span>30%</span>
            <span>15%</span>
          </div>
        </div>
      );
    case 'weightsfine':
      // Fine sliders with exact percents that add to 100, showing you can tune a
      // habit's share to the precise point. The fills glide out to their values
      // in turn, like the sliders settling. Theme-safe: parchment track and
      // thumb, solid accent fill. A fixed width so it takes its own row (rather
      // than being squeezed narrow beside another illustration) and the label
      // and percent always sit at comfortable opposite ends.
      return (
        <div className="w-[248px] max-w-full space-y-4">
          {([
            ['Run', '#5b7a35', 63],
            ['Stretch', '#3a7ca8', 22],
            ['Walk', '#b7902a', 15],
          ] as const).map(([label, c, pct], i) => (
            <div key={label}>
              <div className="mb-1.5 flex items-center justify-between gap-4 text-[11px]">
                <span className="flex min-w-0 items-center gap-1.5 text-ink-700">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: c }} />
                  <span className="truncate">{label}</span>
                </span>
                <span className="shrink-0 font-medium text-ink-500">{pct}%</span>
              </div>
              {/* Track, and a filled portion that glides out to the percent. The
                  thumb rides the fill's leading edge, so it follows along for
                  free as the width animates. */}
              <div className="relative h-2 rounded-full bg-parchment-200">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: c }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 + i * 0.15 }}
                >
                  <span
                    className="absolute h-3.5 w-3.5 rounded-full bg-parchment-50 shadow-card"
                    style={{ top: '50%', right: -7, marginTop: -7, boxShadow: `0 0 0 1.5px ${c}` }}
                  />
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      );
    case 'tug':
      return (
        <div className="flex w-full max-w-[240px] items-center gap-3 rounded-card border border-dashed px-3 py-3" style={{ borderColor: `${ASH}73` }}>
          <span className="h-[22px] w-[22px] rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${ASH}88` }} />
          <span className="flex-1 text-sm text-ink-900">Late-night scrolling</span>
          <span className="text-[10px] uppercase tracking-wide text-ink-300">tug</span>
        </div>
      );
    case 'log':
      return (
        <div className="grid grid-cols-7 gap-1.5" style={{ width: 'fit-content' }}>
          {Array.from({ length: 21 }).map((_, i) => {
            const on = [1, 2, 4, 8, 9, 11, 15, 16, 18].includes(i);
            return <span key={i} className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: on ? '#b5532f' : 'var(--parchment-300)' }} />;
          })}
        </div>
      );
    case 'sync':
      return (
        <div className="flex items-center gap-5">
          {[
            ['#c0392b', 'Offline'],
            ['#b7902a', 'Syncing'],
            ['var(--sage-500)', 'Synced'],
          ].map(([c, label]) => (
            <span key={label} className="flex flex-col items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-[10px] text-ink-300">{label}</span>
            </span>
          ))}
        </div>
      );
    case 'reminder':
      return (
        <div className="w-full max-w-[240px] rounded-card bg-parchment-50 px-3.5 py-3 shadow-card">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-iris-500 font-serif text-sm text-on-primary">h</span>
            <span className="text-xs font-semibold text-ink-900">Harmony</span>
            <span className="ml-auto text-[10px] text-ink-300">now</span>
          </div>
          <p className="mt-1.5 text-sm text-ink-700">A little time for your morning walk.</p>
        </div>
      );
    case 'logo':
      // Just the real app icon, the same one that sits on the home screen.
      return (
        <img
          src="/icons/icon-192.png"
          alt="Harmony"
          width={84}
          height={84}
          className="shadow-card"
          style={{ borderRadius: '21px' }}
        />
      );
    case 'themes':
      // Accent-forward "theme coins": a small paper centre ringed by the theme's
      // accent, with a neutral gray hairline that reads on any current theme.
      // The vivid accent dominates (legible on light and dark alike) while the
      // paper dot hints light-vs-dark without glaring as a solid block.
      return (
        <div className="grid max-w-[210px] grid-cols-4 justify-items-center gap-3.5">
          {[
            ['#b5532f', '#fbf1e4'], // Terracotta
            ['#f2a900', '#fff4d6'], // Mango Sunshine
            ['#47602a', '#e8ecd8'], // Sage Grove
            ['#7c6bd0', '#f1eefa'], // Lavender
            ['#c25072', '#fbeef0'], // Rose Quartz
            ['#8c7ce0', '#1b1e2c'], // Indigo Night
            ['#cf9455', '#241d17'], // Espresso
            ['#74c084', '#16211a'], // Forest Night
          ].map(([accent, paper]) => (
            <span
              key={accent}
              className="h-[42px] w-[42px] rounded-full"
              style={{
                background: `radial-gradient(circle at center, ${paper} 0 44%, ${accent} 46% 100%)`,
                boxShadow: '0 0 0 1px rgba(128,128,128,0.35)',
              }}
            />
          ))}
        </div>
      );
    case 'sort':
      return (
        <div className="w-full max-w-[240px]">
          <div className="mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--ink-300)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 6h13M4 12h9M4 18h5" />
            </svg>
            <span className="rounded-full bg-parchment-200 px-2.5 py-1 text-[11px] font-medium text-ink-700">Time of day</span>
          </div>
          <div className="space-y-1.5">
            {[
              ['Morning', '#e0962a'],
              ['Afternoon', '#3a7ca8'],
              ['Evening', '#7a3b6e'],
              ['Anytime', '#8a8f98'],
            ].map(([label, c]) => (
              <div key={label} className="flex items-center gap-2 rounded-card bg-parchment-50 px-3 py-2 shadow-card">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                <span className="text-xs text-ink-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'insights':
      return (
        <div className="w-full max-w-[240px]">
          {/* A range switcher, a little trend line, and rhythm bars. */}
          <div className="mb-2.5 flex gap-1 rounded-full bg-parchment-200 p-0.5 text-[10px] font-medium">
            <span className="flex-1 rounded-full bg-parchment-50 py-1 text-center text-ink-900 shadow-card">Week</span>
            {['Month', 'Year', 'All'].map((l) => (
              <span key={l} className="flex-1 py-1 text-center text-ink-300">{l}</span>
            ))}
          </div>
          <div className="rounded-card bg-parchment-50 p-3 shadow-card">
            <svg viewBox="0 0 200 56" width="100%" height="48" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--iris-500)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--iris-500)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M4 44 L36 30 L68 34 L100 16 L132 22 L164 10 L196 14 L196 52 L4 52 Z" fill="url(#gi)" />
              <path d="M4 44 L36 30 L68 34 L100 16 L132 22 L164 10 L196 14" fill="none" stroke="var(--iris-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="mt-2 flex items-end gap-1" style={{ height: 26 }}>
              {[10, 16, 8, 22, 14, 24, 12].map((h, i) => (
                <span key={i} className="flex-1 rounded-t-[3px]" style={{ height: h, backgroundColor: i === 5 ? '#3a7ca8' : 'rgba(58,124,168,0.5)' }} />
              ))}
            </div>
          </div>
        </div>
      );
    case 'palette':
      return (
        <div className="grid grid-cols-6 gap-2">
          {[
            '#7BA834', '#1F9A6D', '#3A7CA8', '#6A6FD0', '#9B6FC0', '#D65B4A',
            '#C66A2C', '#B7902A', '#94405E', '#2E8C8C', '#404780', '#5A636F',
          ].map((c) => (
            <span key={c} className="h-7 w-7 rounded-full" style={{ backgroundColor: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }} />
          ))}
        </div>
      );
    case 'garden': {
      const bloom = (vals: number[]) =>
        vals.map((value, i) => ({ id: String(i), name: '', color: ['#b5532f', '#3a7ca8', '#5b7a35', '#7a3b6e'][i], value }));
      return (
        <div className="flex items-end gap-2.5">
          <MiniBloom petals={bloom([0.9, 0.7, 0.85, 0.6])} size={64} />
          <MiniBloom petals={bloom([0.45, 0.6, 0.3, 0.5])} size={64} />
          <MiniBloom petals={bloom([0.2, 0.12, 0.28, 0.15])} size={64} />
        </div>
      );
    }
    case 'ritual':
      return (
        <div className="w-full max-w-[240px] space-y-1.5">
          {[
            ['Stretch', '#5b7a35', true],
            ['Journal', '#3a7ca8', true],
            ['A glass of water', '#b7902a', false],
          ].map(([label, c, done], i) => (
            <div key={label as string} className="flex items-center gap-2.5 rounded-card bg-parchment-50 px-3 py-2 shadow-card">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold" style={done ? { backgroundColor: c as string, color: '#fff' } : { boxShadow: `inset 0 0 0 1.5px ${c as string}`, color: c as string }}>
                {i + 1}
              </span>
              <span className="text-xs text-ink-700">{label as string}</span>
            </div>
          ))}
        </div>
      );
    case 'confetti': {
      // A Bloom at its fullest, every petal reaching the ring, with a scatter of
      // confetti lifting off it in the areas' own colours, the exact moment the
      // celebration marks.
      // x, y, size, rotation(deg), colour — a loose, upward-drifting scatter.
      const pieces: [number, number, number, number, string][] = [
        [24, 20, 7, 20, '#b5532f'],
        [46, 10, 6, -25, '#b7902a'],
        [70, 8, 7, 40, '#5b7a35'],
        [92, 16, 6, 15, '#3a7ca8'],
        [104, 34, 7, -30, '#7a3b6e'],
        [14, 40, 6, 45, '#3a7ca8'],
        [100, 60, 6, 30, '#b7902a'],
        [16, 66, 7, -20, '#5b7a35'],
        [58, 4, 6, 10, '#944021'],
        [34, 8, 5, -40, '#7a3b6e'],
      ];
      return (
        <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden="true">
          <circle cx="60" cy="60" r="44" fill="none" stroke="var(--parchment-300)" strokeDasharray="2 4" />
          <g>
            <path d="M60 60 L60 18 A42 42 0 0 1 96 39 Z" fill="#b5532f" opacity="0.9" />
            <path d="M60 60 L96 39 A42 42 0 0 1 96 81 Z" fill="#b7902a" opacity="0.85" />
            <path d="M60 60 L96 81 A42 42 0 0 1 60 102 Z" fill="#5b7a35" opacity="0.9" />
            <path d="M60 60 L60 102 A42 42 0 0 1 24 81 Z" fill="#7a3b6e" opacity="0.82" />
            <path d="M60 60 L24 81 A42 42 0 0 1 24 39 Z" fill="#3a7ca8" opacity="0.88" />
            <path d="M60 60 L24 39 A42 42 0 0 1 60 18 Z" fill="#944021" opacity="0.85" />
          </g>
          <circle cx="60" cy="60" r="16" fill="var(--parchment-50)" />
          <text x="60" y="61" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-serif)" fontSize="20" fill="var(--iris-500)">h</text>
          {pieces.map(([x, y, s, r, c], i) => (
            <rect
              key={i}
              x={x - s / 2}
              y={y - s / 2}
              width={s}
              height={s * 0.62}
              rx={1}
              fill={c}
              transform={`rotate(${r} ${x} ${y})`}
            />
          ))}
        </svg>
      );
    }
    case 'guide':
      return (
        <div className="w-full max-w-[240px]">
          <div className="flex gap-1 rounded-full bg-parchment-200 p-1 text-[11px] font-medium">
            <span className="flex-1 rounded-full bg-parchment-50 py-1 text-center text-ink-900 shadow-card">What's new</span>
            <span className="flex-1 py-1 text-center text-ink-300">Guide</span>
          </div>
          <div className="mt-2 space-y-1.5">
            <span className="block h-2 w-3/4 rounded-full bg-parchment-300" />
            <span className="block h-2 w-full rounded-full bg-parchment-200" />
            <span className="block h-2 w-5/6 rounded-full bg-parchment-200" />
          </div>
        </div>
      );
  }
}
