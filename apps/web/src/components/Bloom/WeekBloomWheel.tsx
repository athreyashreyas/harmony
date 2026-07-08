import type { GardenPetal } from '../../lib/insights/garden';
import { hexToRgba } from '../../lib/color';
import { describeDonutSegment } from './geometry';

const SIZE = 220;
const CENTER = SIZE / 2;
const MIN_RADIUS = 22;
const MAX_RADIUS = 80;
const CENTER_RADIUS = 20;
const GAP_DEGREES = 4;
const RING_1 = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * 0.33;
const RING_2 = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * 0.66;

// A full-size snapshot of one past week's Bloom: the same geometry and colours
// as the live Bloom (components/Bloom/Bloom.tsx), but drawn once at that
// week's resting values — no springs, no interaction, since it's history.
export default function WeekBloomWheel({ petals }: { petals: GardenPetal[] }) {
  const n = petals.length;
  const sliceAngle = n > 0 ? 360 / n : 0;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block h-full w-full" role="img" aria-label="That week's bloom">
      <circle cx={CENTER} cy={CENTER} r={RING_1} fill="none" stroke="var(--parchment-300)" strokeDasharray="2 4" />
      <circle cx={CENTER} cy={CENTER} r={RING_2} fill="none" stroke="var(--parchment-300)" strokeDasharray="2 4" />

      {petals.map((p, i) => {
        const start = i * sliceAngle + GAP_DEGREES / 2;
        const end = (i + 1) * sliceAngle - GAP_DEGREES / 2;
        const r = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.max(0, Math.min(1, p.value));
        return (
          <g key={p.id}>
            <path d={describeDonutSegment(CENTER, CENTER, MIN_RADIUS, MAX_RADIUS, start, end)} fill={hexToRgba(p.color, 0.13)} />
            <path d={describeDonutSegment(CENTER, CENTER, MIN_RADIUS, r, start, end)} fill={hexToRgba(p.color, 0.87)} />
          </g>
        );
      })}

      <circle cx={CENTER} cy={CENTER} r={CENTER_RADIUS} fill="var(--parchment-50)" />
      <text
        x={CENTER}
        y={CENTER}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="20"
        fill="var(--iris-500)"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        h
      </text>
    </svg>
  );
}
