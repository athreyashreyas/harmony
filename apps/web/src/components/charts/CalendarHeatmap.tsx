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

  // A month label above the column where each new month first appears, but never
  // closer than MIN_LABEL_GAP columns to the last shown label, so short partial
  // months don't crowd their neighbour (e.g. "JunJul").
  const MIN_LABEL_GAP = 3;
  const monthLabels: { index: number; label: string }[] = [];
  let prevMonth = '';
  let lastShown = -Infinity;
  weeks.forEach((week, i) => {
    const firstCell = week.find((c) => c != null);
    if (!firstCell) return;
    const m = firstCell.date.slice(0, 7);
    if (m === prevMonth) return;
    prevMonth = m;
    if (i - lastShown < MIN_LABEL_GAP) return;
    monthLabels.push({ index: i, label: monthShort(firstCell.date) });
    lastShown = i;
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
        {/* Weekday labels down the left, all seven, so a missed day is easy to place. */}
        <div className="mr-2 shrink-0" style={{ paddingTop: MONTH_ROW }}>
          {WEEKDAY_SHORT.map((d, r) => (
            <div key={r} className="flex items-center" style={{ height: CELL, marginBottom: r < 6 ? GAP : 0 }}>
              <span className="text-[9px] leading-none text-ink-300">{d}</span>
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
                  if (cell.future) {
                    // A day still to come: a dashed outline, clearly not a missed day.
                    return (
                      <span
                        key={di}
                        className="rounded-[3px] border border-dashed"
                        style={{ height: CELL, width: CELL, borderColor: 'var(--parchment-300)' }}
                        title={`${cell.date}: still to come`}
                      />
                    );
                  }
                  return (
                    <span
                      key={di}
                      className="rounded-[3px]"
                      // A hairline border so each day is discernible: empty ones
                      // against the card, and filled ones from same-colour neighbours.
                      style={{ height: CELL, width: CELL, backgroundColor: fill(cell.ratio, cell.count), boxShadow: 'inset 0 0 0 1px rgba(35,25,15,0.10)' }}
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
