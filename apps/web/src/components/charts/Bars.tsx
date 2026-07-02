import { hexToRgba } from '../../lib/color';

export interface BarDatum {
  label: string;
  value: number;
  // Optional highlight (e.g. the strongest weekday) for a slightly bolder bar.
  emphasis?: boolean;
}

// A small, responsive vertical bar chart built from divs (crisp at any width, no
// SVG scaling quirks). Bars are the accent colour; the tallest is lifted so the
// eye finds the peak. Gentle: counts show only above bars that have any.
export default function Bars({
  data,
  color = '#5a636f',
  height = 96,
  showValues = true,
}: {
  data: BarDatum[];
  color?: string;
  height?: number;
  showValues?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5" style={{ height: height + 22 }}>
      {data.map((d, i) => {
        const frac = d.value / max;
        const isPeak = d.value === max && d.value > 0;
        return (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
            {showValues && (
              <span className="text-[10px] font-medium text-ink-500" style={{ opacity: d.value > 0 ? 1 : 0 }}>
                {d.value}
              </span>
            )}
            <div
              className="w-full rounded-t-[5px] transition-[height]"
              style={{
                height: Math.max(2, frac * height),
                backgroundColor: isPeak ? color : hexToRgba(color, 0.5),
              }}
            />
            <span className="text-[10px] text-ink-300">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
