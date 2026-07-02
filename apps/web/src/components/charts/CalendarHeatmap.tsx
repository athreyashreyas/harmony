import { useLayoutEffect, useRef } from 'react';
import { hexToRgba } from '../../lib/color';
import { todayISO, weekdayOf } from '../../lib/time/dates';
import type { CalendarCell } from '../../lib/insights/analytics';

// A quiet contribution-style heatmap: one dot per day, in weekday columns, its
// warmth rising with how much you showed up. Month labels run across the top and
// weekday labels down the left so it's easy to place a day in time. It scrolls
// both ways but opens anchored on the present, so the current month is in view
// without scrolling, with today ringed. Never red, never a scold. An empty day
// is just soft paper.
const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const MONTH_ROW = 14;

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthShort = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short' });
const longDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export default function CalendarHeatmap({ cells, color = '#5b7a35' }: { cells: CalendarCell[]; color?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = todayISO();

  const hasCells = cells.length > 0;
  const lead = hasCells ? weekdayOf(cells[0].date) : 0;
  const todayIndex = hasCells ? cells.findIndex((c) => c.date === today) : -1;
  const todayCol = todayIndex >= 0 ? Math.floor((lead + todayIndex) / 7) : -1;

  // Open scrolled so the present is in view, with a little future to its right.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || todayCol < 0) return;
    el.scrollLeft = Math.max(0, todayCol * STEP - el.clientWidth * 0.6);
  }, [todayCol]);

  if (!hasCells) return null;

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
    <div ref={scrollRef} className="-mx-1 overflow-x-auto px-1">
      <div className="flex" style={{ width: 'max-content' }}>
        {/* Weekday labels down the left, all seven, sticky so they stay in view. */}
        <div className="sticky left-0 z-[1] mr-2 shrink-0 bg-parchment-50" style={{ paddingTop: MONTH_ROW }}>
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
                  const isToday = cell.date === today;
                  if (cell.future) {
                    return (
                      <span
                        key={di}
                        className="rounded-[3px] border border-dashed"
                        style={{ height: CELL, width: CELL, borderColor: 'var(--parchment-300)' }}
                        title={`${longDay(cell.date)}: still to come`}
                      />
                    );
                  }
                  return (
                    <span
                      key={di}
                      className="rounded-[3px]"
                      // A hairline border so each day is discernible; today wears a
                      // ring so the present is easy to find in the year.
                      style={{ height: CELL, width: CELL, backgroundColor: fill(cell.ratio, cell.count), boxShadow: `inset 0 0 0 1px ${isToday ? 'var(--iris-500)' : 'rgba(35,25,15,0.10)'}` }}
                      title={`${longDay(cell.date)}: ${cell.count === 0 ? 'nothing logged' : `${cell.count} logged`}`}
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
