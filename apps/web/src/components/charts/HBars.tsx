import { hexToRgba } from '../../lib/color';

export interface HBarDatum {
  label: string;
  value: number;
}

// Horizontal bars, so category names sit in full beside each bar (no cramped
// abbreviations). Used for the time-of-day breakdown, where "Afternoon" deserves
// its whole name.
export default function HBars({ data, color = '#b7902a' }: { data: HBarDatum[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const frac = d.value / max;
        const isPeak = d.value === max && d.value > 0;
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-ink-500">{d.label}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-parchment-200">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${Math.max(d.value > 0 ? 4 : 0, frac * 100)}%`, backgroundColor: isPeak ? color : hexToRgba(color, 0.55) }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-xs text-ink-300">{d.value || ''}</span>
          </div>
        );
      })}
    </div>
  );
}
