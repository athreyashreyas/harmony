import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import type { Area, Habit, Log } from '@harmony/shared';
import { isoDaysAgo, startOfWeekISO } from '../../lib/time/dates';

const SPARKLINE_DAYS = 14;

function GripIcon({ small = false }: { small?: boolean }) {
  const s = small ? 12 : 14;
  return (
    <svg width={s} height={(s / 14) * 20} viewBox="0 0 14 20" fill="currentColor" aria-hidden="true">
      {[3, 9, 15].map((y) => [3, 11].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />))}
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

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

const IMPORTANCE_LABEL: Record<Area['importance'], string> = {
  core: 'Really matters',
  matters: 'Matters',
  optional: 'Nice to have',
};

// One reorderable habit inside an expanded area. Its own drag handle, so it
// never conflicts with the area's drag.
function HabitRow({
  habit,
  color,
  onOpen,
}: {
  habit: Habit;
  color: string;
  onOpen?: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={habit}
      dragListener={false}
      dragControls={controls}
      transition={{ duration: 0 }}
      className="flex select-none items-center gap-2 rounded-lg bg-parchment-100 px-2 py-2"
    >
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          controls.start(e);
        }}
        aria-label={`Reorder ${habit.name}`}
        style={{ touchAction: 'none' }}
        className="-m-1 shrink-0 cursor-grab touch-none p-1 text-ink-300 active:cursor-grabbing"
      >
        <GripIcon small />
      </button>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: habit.color ?? color }} />
        <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{habit.name}</span>
      </button>
    </Reorder.Item>
  );
}

// One row in the Areas list. Drag handle reorders. When `expandable`, tapping
// the row reveals the area's habits as a reorderable list, and the pencil on the
// right edits the area; otherwise (Settings' priority list) the whole row edits.
export default function AreaRow({
  area,
  habits,
  logs,
  onOpen,
  showImportance = false,
  expandable = false,
  onReorderHabits,
  onOpenHabit,
}: {
  area: Area;
  habits: Habit[];
  logs: Log[];
  onOpen: () => void;
  showImportance?: boolean;
  expandable?: boolean;
  onReorderHabits?: (next: Habit[]) => void;
  onOpenHabit?: (habitId: string) => void;
}) {
  const dragControls = useDragControls();
  const [expanded, setExpanded] = useState(false);

  const areaHabits = useMemo(
    () =>
      habits
        .filter((h) => h.areaId === area.id && h.archivedAt == null)
        .sort((a, b) => a.order - b.order),
    [habits, area.id],
  );
  const [ordered, setOrdered] = useState<Habit[]>(areaHabits);
  useEffect(() => {
    setOrdered(areaHabits);
  }, [areaHabits]);

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

  function handleReorder(next: Habit[]) {
    setOrdered(next);
    onReorderHabits?.(next);
  }

  return (
    <Reorder.Item
      value={area}
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{ scale: 1.02, boxShadow: '0 10px 26px rgba(35, 25, 15, 0.18)' }}
      // No reflow animation: items snap into place the instant you release.
      transition={{ duration: 0 }}
      className="select-none rounded-card bg-parchment-50 px-3 py-3 shadow-card"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
          aria-label={`Reorder ${area.name}`}
          style={{ touchAction: 'none' }}
          className="-m-1.5 shrink-0 cursor-grab touch-none p-1.5 text-ink-300 active:cursor-grabbing"
        >
          <GripIcon />
        </button>

        <button
          type="button"
          onClick={expandable ? () => setExpanded((v) => !v) : onOpen}
          aria-expanded={expandable ? expanded : undefined}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
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

          {!expandable && (
            <span className="hidden shrink-0 items-center gap-0.5 sm:flex" aria-hidden="true">
              {sparkline.map(({ date, tended }) => (
                <span
                  key={date}
                  className="h-3.5 w-1 rounded-full"
                  style={{ backgroundColor: tended ? area.color : 'var(--parchment-300)' }}
                />
              ))}
            </span>
          )}
        </button>

        {expandable ? (
          <>
            <motion.span
              aria-hidden="true"
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.18 }}
              className="shrink-0 text-ink-300"
            >
              <ChevronIcon />
            </motion.span>
            <button
              type="button"
              onClick={onOpen}
              aria-label={`Edit ${area.name}`}
              className="-m-1.5 shrink-0 p-1.5 text-ink-300 hover:text-ink-700"
            >
              <PencilIcon />
            </button>
          </>
        ) : (
          <span className="shrink-0 text-ink-300">
            <ChevronIcon />
          </span>
        )}
      </div>

      {expandable && (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pl-1">
                {ordered.length === 0 ? (
                  <p className="px-2 pb-1 text-xs text-ink-300">No habits in this area yet.</p>
                ) : (
                  <Reorder.Group axis="y" values={ordered} onReorder={handleReorder} className="space-y-2">
                    {ordered.map((habit) => (
                      <HabitRow
                        key={habit.id}
                        habit={habit}
                        color={area.color}
                        onOpen={onOpenHabit ? () => onOpenHabit(habit.id) : undefined}
                      />
                    ))}
                  </Reorder.Group>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Reorder.Item>
  );
}
