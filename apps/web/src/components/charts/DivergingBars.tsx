import type { TugPoint } from '../../lib/insights/analytics';

// Lift vs drag: tending rises above the line, tugs pull below it, so a stretch
// shows the honest picture rather than only the wins. Built from divs for crisp
// edges at any width. `cap` matches the tug penalty ceiling from the analytics.
const CAP = 0.6;

export default function DivergingBars({
  data,
  liftColor = 'var(--sage-500)',
  dragColor = '#5a636f',
  half = 46,
}: {
  data: TugPoint[];
  liftColor?: string;
  dragColor?: string;
  half?: number;
}) {
  if (data.length === 0) return null;
  const n = data.length;
  const step = Math.max(1, Math.ceil(n / 6));

  return (
    <div>
      <div className="flex items-stretch gap-1">
        {data.map((p, i) => (
          <div key={i} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-end justify-center" style={{ height: half }}>
              <div
                className="w-full max-w-[14px] rounded-t-[4px]"
                style={{ height: Math.max(p.lift > 0 ? 2 : 0, p.lift * half), backgroundColor: liftColor }}
              />
            </div>
            <div className="h-px w-full bg-parchment-300" />
            <div className="flex w-full items-start justify-center" style={{ height: half }}>
              <div
                className="w-full max-w-[14px] rounded-b-[4px]"
                style={{ height: Math.max(p.drag > 0 ? 2 : 0, (p.drag / CAP) * half), backgroundColor: dragColor }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between px-1">
        {data.map((p, i) => (
          <span key={i} className="text-[10px] text-ink-300">{i % step === 0 || i === n - 1 ? p.label : ''}</span>
        ))}
      </div>
    </div>
  );
}
