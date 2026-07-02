import type { GardenPetal } from '../../lib/insights/garden';

// A small, pressed-flower rendering of one week's bloom: a petal per area, its
// length set by how full that part of life was that week, in the area's colour.
// The same visual language as the live Bloom, shrunk for the garden.
export default function MiniBloom({ petals, size = 76 }: { petals: GardenPetal[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 3;
  const n = petals.length;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--parchment-300)" strokeDasharray="2 4" />
      <g style={{ mixBlendMode: 'multiply' }}>
        {petals.map((p, i) => {
          const r = R * (0.32 + 0.68 * Math.max(0, Math.min(1, p.value)));
          if (n === 1) return <circle key={p.id} cx={cx} cy={cy} r={r} fill={p.color} opacity={0.8} />;
          const seg = (Math.PI * 2) / n;
          const a0 = -Math.PI / 2 + i * seg;
          const a1 = -Math.PI / 2 + (i + 1) * seg;
          const x0 = cx + Math.cos(a0) * r;
          const y0 = cy + Math.sin(a0) * r;
          const x1 = cx + Math.cos(a1) * r;
          const y1 = cy + Math.sin(a1) * r;
          const large = seg > Math.PI ? 1 : 0;
          return <path key={p.id} d={`M ${cx} ${cy} L ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`} fill={p.color} opacity={0.8} />;
        })}
      </g>
      <circle cx={cx} cy={cy} r={R * 0.26} fill="var(--parchment-50)" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-serif)" fontSize={size * 0.2} fill="var(--iris-500)">
        h
      </text>
    </svg>
  );
}
