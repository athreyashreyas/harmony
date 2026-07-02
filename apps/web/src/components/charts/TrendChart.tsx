import { useId } from 'react';
import type { TrendPoint } from '../../lib/insights/analytics';

// A calm area+line chart of tending momentum over time (each point a ratio in
// [0,1]). Bespoke SVG so it wears the theme and adds no dependency. The stroke
// stays even under the non-uniform stretch via non-scaling-stroke; axis labels
// live in a flex row below so text never distorts.
const W = 320;
const H = 116;
const PAD = 8;

export default function TrendChart({ points, color = 'var(--iris-500)' }: { points: TrendPoint[]; color?: string }) {
  // useId contains colons, which are invalid inside url(#…); strip them.
  const gradId = `trend-${useId().replace(/:/g, '')}`;
  if (points.length === 0) return null;

  const n = points.length;
  const x = (i: number) => (n === 1 ? W / 2 : PAD + (i / (n - 1)) * (W - PAD * 2));
  const y = (r: number) => PAD + (1 - r) * (H - PAD * 2);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.ratio).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(n - 1).toFixed(1)} ${H - PAD} L ${x(0).toFixed(1)} ${H - PAD} Z`;

  // Show a handful of evenly-spaced labels so the axis stays readable.
  const step = Math.max(1, Math.ceil(n / 6));
  const labels = points.map((p, i) => (i % step === 0 || i === n - 1 ? p.label : ''));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label="Tending over time">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Soft baseline + midline for reference. */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--parchment-300)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={PAD} y1={y(0.5)} x2={W - PAD} y2={y(0.5)} stroke="var(--parchment-300)" strokeWidth="1" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" opacity="0.7" />
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1.5 flex justify-between px-1">
        {labels.map((l, i) => (
          <span key={i} className="text-[10px] text-ink-300">{l}</span>
        ))}
      </div>
    </div>
  );
}
