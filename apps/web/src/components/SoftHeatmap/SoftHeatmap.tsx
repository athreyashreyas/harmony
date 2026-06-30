import { useMemo, useState } from 'react';
import type { Habit, Log } from '@harmony/shared';
import { hexToRgba } from '../../lib/color';
import { isHabitDueOn } from '../../lib/time/cadence';
import { formatDateMedium, isoDaysAgo, todayISO } from '../../lib/time/dates';

const DAYS = 28; // 4 rows of 7 (section 11.2)

interface DayCell {
  date: string;
  tended: boolean;
  scheduled: boolean;
  note: string | null;
  isToday: boolean;
}

// The 28 day soft-dot heatmap. Never red, never hollow: an untended scheduled
// day is a quiet parchment-300 dot, an untended unscheduled day is almost
// invisible parchment-200, a tended day is the area's colour. Today wears a
// thin iris ring.
export default function SoftHeatmap({
  habit,
  logs,
  color,
}: {
  habit: Habit;
  logs: Log[];
  color: string;
}) {
  const today = todayISO();
  const [selected, setSelected] = useState<DayCell | null>(null);

  const cells = useMemo<DayCell[]>(() => {
    const byDate = new Map(logs.map((l) => [l.date, l]));
    const out: DayCell[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const date = isoDaysAgo(i);
      const log = byDate.get(date);
      out.push({
        date,
        tended: log != null,
        scheduled: isHabitDueOn(habit, date),
        note: log?.note ?? null,
        isToday: date === today,
      });
    }
    return out;
  }, [habit, logs, today]);

  function dotColor(cell: DayCell): string {
    if (cell.tended) return hexToRgba(color, 0.87);
    if (cell.scheduled) return 'var(--parchment-300)';
    return 'var(--parchment-200)';
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-7 gap-2" style={{ width: 'fit-content' }}>
        {cells.map((cell) => (
          <button
            key={cell.date}
            type="button"
            onClick={() => setSelected((s) => (s?.date === cell.date ? null : cell))}
            aria-label={formatDateMedium(cell.date)}
            className="h-3.5 w-3.5 rounded-full"
            style={{
              backgroundColor: dotColor(cell),
              boxShadow: cell.isToday ? '0 0 0 1.5px var(--iris-500)' : undefined,
            }}
          />
        ))}
      </div>

      {selected && (
        <div className="mt-3 rounded-card bg-parchment-100 p-3 text-xs">
          <p className="font-medium text-ink-700">{formatDateMedium(selected.date)}</p>
          {selected.note ? (
            <p className="mt-1 italic text-ink-500">&ldquo;{selected.note}&rdquo;</p>
          ) : (
            <p className="mt-1 text-ink-300">{selected.tended ? 'Tended.' : 'Untended.'}</p>
          )}
        </div>
      )}
    </div>
  );
}
