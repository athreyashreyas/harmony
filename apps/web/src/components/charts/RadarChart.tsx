import { useId } from 'react';

export interface RadarDatum {
  label: string;
  value: number; // 0..1
  color: string;
}

// A balance constellation: each area is a spoke, its point set by how full that
// part of life is. The shape it traces shows, at a glance, whether attention is
// spread wide or gathered in a few places, a companion to the Bloom. Needs at
// least three areas to form a shape.
const SIZE = 200;
const C = SIZE / 2;
const R = SIZE / 2 - 26;

export default function RadarChart({ data }: { data: RadarDatum[] }) {
  const gradId = `radar-${useId().replace(/:/g, '')}`;
  const n = data.length;
  if (n < 3) return null;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, r: number) => ({
    x: C + Math.cos(angle(i)) * R * r,
    y: C + Math.sin(angle(i)) * R * r,
  });

  const shape = data.map((d, i) => point(i, Math.max(0.04, d.value))).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height={SIZE} className="max-w-[280px]" role="img" aria-label="Balance across areas">
        <defs>
          <radialGradient id={gradId}>
            <stop offset="0%" stopColor="var(--iris-500)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--iris-500)" stopOpacity="0.12" />
          </radialGradient>
        </defs>
        {/* Reference rings. */}
        {[0.34, 0.67, 1].map((r) => (
          <circle key={r} cx={C} cy={C} r={R * r} fill="none" stroke="var(--parchment-300)" strokeWidth="1" strokeDasharray={r === 1 ? undefined : '2 4'} />
        ))}
        {/* Spokes. */}
        {data.map((_, i) => {
          const p = point(i, 1);
          return <line key={i} x1={C} y1={C} x2={p.x} y2={p.y} stroke="var(--parchment-300)" strokeWidth="1" />;
        })}
        {/* The filled shape. */}
        <polygon points={shape} fill={`url(#${gradId})`} stroke="var(--iris-500)" strokeWidth="1.5" strokeLinejoin="round" />
        {/* Each area's point, in its own colour. */}
        {data.map((d, i) => {
          const p = point(i, Math.max(0.04, d.value));
          return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={d.color} />;
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {data.map((d) => (
          <span key={d.label} className="flex items-center gap-1.5 text-xs text-ink-500">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color }} />
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
