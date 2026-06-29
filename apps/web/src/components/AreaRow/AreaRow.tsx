import { useMemo } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import type { Area, Habit, Log } from '@harmony/shared';
import { isoDaysAgo, todayISO } from '../../lib/time/dates';

const SPARKLINE_DAYS = 14;

function startOfWeekISO(today: string = todayISO()): string {
  const date = new Date(`${today}T00:00:00`);
  date.setDate(date.getDate() - date.getDay());
  return todayISO(date);
}

function GripIcon() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true">
      {[3, 9, 15].map((y) =>
        [3, 11].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />),
      )}
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

const IMPORTANCE_LABEL: Record<Area['importance'], string> = {
  core: 'Really matters',
  matters: 'Matters',
  optional: 'Nice to have',
};

// One row in the Areas list (section 10), and identically in Settings'
// priority list (section 14) with showImportance set, which adds the tier
// chip. Drag handle reorders, tapping the row opens the edit sheet (there is
// no separate per-area detail screen in the spec).
export default function AreaRow({
  area,
  habits,
  logs,
  onOpen,
  showImportance = false,
}: {
  area: Area;
  habits: Habit[];
  logs: Log[];
  onOpen: () => void;
  showImportance?: boolean;
}) {
  const dragControls = useDragControls();

  const areaHabits = useMemo(() => habits.filter((h) => h.areaId === area.id), [habits, area.id]);

  const tendedDatesThisWeek = useMemo(() => {
    const weekStart = startOfWeekISO();
    const dates = new Set<string>();
    for (const log of logs) {
      if (log.areaId === area.id && log.date >= weekStart) dates.add(log.date);
    }
    return dates.size;
  }, [logs, area.id]);

  const sparkline = useMemo(() => {
    const days: { date: string; tended: boolean }[] = [];
    for (let i = SPARKLINE_DAYS - 1; i >= 0; i--) {
      const date = isoDaysAgo(i);
      const tended = logs.some((l) => l.areaId === area.id && l.date === date);
      days.push({ date, tended });
    }
    return days;
  }, [logs, area.id]);

  return (
    <Reorder.Item
      value={area}
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{ scale: 1.02, boxShadow: '0 10px 26px rgba(35, 25, 15, 0.18)' }}
      transition={{ type: 'spring', stiffness: 600, damping: 40 }}
      className="flex touch-pan-y select-none items-center gap-3 rounded-card bg-parchment-50 px-3 py-3 shadow-card"
    >
      <button
        type="button"
        onPointerDown={(e) => {
          // Begin dragging straight from the press, and keep the gesture from
          // turning into a scroll, text selection, or long-press callout.
          e.preventDefault();
          dragControls.start(e);
        }}
        aria-label={`Reorder ${area.name}`}
        style={{ touchAction: 'none' }}
        className="-m-1.5 shrink-0 cursor-grab touch-none p-1.5 text-ink-300 active:cursor-grabbing"
      >
        <GripIcon />
      </button>

      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: area.color }} />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink-900">{area.name}</span>
          <span className="block truncate text-xs text-ink-500">
            {areaHabits.length} habit{areaHabits.length === 1 ? '' : 's'}, {tendedDatesThisWeek} tended this week
          </span>
        </span>

        {showImportance && (
          <span className="hidden shrink-0 rounded-full bg-parchment-200 px-2.5 py-1 text-[10px] font-medium text-ink-500 sm:inline-block">
            {IMPORTANCE_LABEL[area.importance]}
          </span>
        )}

        <span className="hidden shrink-0 items-center gap-0.5 sm:flex" aria-hidden="true">
          {sparkline.map(({ date, tended }) => (
            <span
              key={date}
              className="h-3.5 w-1 rounded-full"
              style={{ backgroundColor: tended ? area.color : 'var(--parchment-300)' }}
            />
          ))}
        </span>

        <span className="shrink-0 text-ink-300">
          <ChevronIcon />
        </span>
      </button>
    </Reorder.Item>
  );
}
