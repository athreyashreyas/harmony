import { hexToRgba } from '../../lib/color';
import { weekdayOf } from '../../lib/time/dates';
import type { CalendarCell } from '../../lib/insights/analytics';

// A quiet contribution-style heatmap: one dot per day, in weekday columns, its
// warmth rising with how much you showed up. Scrolls sideways for longer ranges
// so it never crushes on small screens. Never red, never a scold — an empty day
// is just soft paper.
export default function CalendarHeatmap({ cells, color = '#5b7a35' }: { cells: CalendarCell[]; color?: string }) {
  if (cells.length === 0) return null;

  // Pad the front so the first column starts on the right weekday (Sun row 0).
  const lead = weekdayOf(cells[0].date);
  const padded: (CalendarCell | null)[] = [...Array(lead).fill(null), ...cells];
  const weeks: (CalendarCell | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const fill = (ratio: number, count: number): string => {
    if (count === 0) return 'var(--parchment-200)';
    if (ratio >= 1) return color;
    if (ratio >= 0.67) return hexToRgba(color, 0.8);
    if (ratio >= 0.34) return hexToRgba(color, 0.58);
    return hexToRgba(color, 0.34);
  };

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="flex gap-[3px]" style={{ width: 'max-content' }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }).map((_, di) => {
              const cell = week[di];
              if (!cell) return <span key={di} className="h-[11px] w-[11px]" />;
              return (
                <span
                  key={di}
                  className="h-[11px] w-[11px] rounded-[3px]"
                  style={{ backgroundColor: fill(cell.ratio, cell.count) }}
                  title={`${cell.date}: ${cell.count === 0 ? 'nothing logged' : `${cell.count} logged`}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
