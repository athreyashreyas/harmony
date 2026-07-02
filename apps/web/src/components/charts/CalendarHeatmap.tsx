import { hexToRgba } from '../../lib/color';
import { weekdayOf } from '../../lib/time/dates';
import type { CalendarCell } from '../../lib/insights/analytics';

// A quiet contribution-style heatmap: one dot per day, in weekday columns, its
// warmth rising with how much you showed up. Month labels run across the top and
// weekday labels down the left so it's easy to place a day in time. Scrolls
// sideways for longer ranges. Never red, never a scold. An empty day is just
// soft paper.
const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const MONTH_ROW = 14;

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthShort = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short' });

export default function CalendarHeatmap({ cells, color = '#5b7a35' }: { cells: CalendarCell[]; color?: string }) {
  if (cells.length === 0) return null;

  // Pad the front so the first column starts on the right weekday (Sun = row 0).
  const lead = weekdayOf(cells[0].date);
  const padded: (CalendarCell | null)[] = [...Array(lead).fill(null), ...cells];
  const weeks: (CalendarCell | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  // A month label above the column where each new month first appears.
  const monthLabels: { index: number; label: string }[] = [];
  let prevMonth = '';
  weeks.forEach((week, i) => {
    const firstCell = week.find((c) => c != null);
    if (!firstCell) return;
    const m = firstCell.date.slice(0, 7);
    if (m !== prevMonth) {
      monthLabels.push({ index: i, label: monthShort(firstCell.date) });
      prevMonth = m;
    }
  });

  const fill = (ratio: number, count: number): string => {
    if (count === 0) return 'var(--parchment-200)';
    if (ratio >= 1) return color;
    if (ratio >= 0.67) return hexToRgba(color, 0.8);
    if (ratio >= 0.34) return hexToRgba(color, 0.58);
    return hexToRgba(color, 0.34);
  };

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="flex" style={{ width: 'max-content' }}>
        {/* Weekday labels down the left (every other row, so they never crowd). */}
        <div className="mr-1.5 shrink-0" style={{ paddingTop: MONTH_ROW }}>
          {WEEKDAY_SHORT.map((d, r) => (
            <div key={r} className="flex items-center" style={{ height: CELL, marginBottom: r < 6 ? GAP : 0 }}>
              <span className="text-[9px] leading-none text-ink-300">{r % 2 === 1 ? d : ''}</span>
            </div>
          ))}
        </div>

        <div>
          {/* Month labels across the top, aligned to the week they begin. */}
          <div className="relative" style={{ height: MONTH_ROW, width: weeks.length * STEP }}>
            {monthLabels.map(({ index, label }) => (
              <span key={index} className="absolute top-0 whitespace-nowrap text-[9px] text-ink-300" style={{ left: index * STEP }}>
                {label}
              </span>
            ))}
          </div>

          <div className="flex" style={{ gap: GAP }}>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                {Array.from({ length: 7 }).map((_, di) => {
                  const cell = week[di];
                  if (!cell) return <span key={di} style={{ height: CELL, width: CELL }} />;
                  return (
                    <span
                      key={di}
                      className="rounded-[3px]"
                      style={{ height: CELL, width: CELL, backgroundColor: fill(cell.ratio, cell.count) }}
                      title={`${cell.date}: ${cell.count === 0 ? 'nothing logged' : `${cell.count} logged`}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
