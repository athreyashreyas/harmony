// A tiny inline line chart for a single habit's recent rhythm. Values are ratios
// in [0,1]; drawn as a smooth stroke with non-scaling width so it stays crisp.
const W = 100;
const H = 28;

export default function Sparkline({ values, color = 'var(--iris-500)' }: { values: number[]; color?: string }) {
  if (values.length === 0) return null;
  const n = values.length;
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => 2 + (1 - v) * (H - 4);
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden="true">
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
