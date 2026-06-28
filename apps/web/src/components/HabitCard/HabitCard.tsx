import { motion } from 'framer-motion';
import type { Area, Habit, TimeOfDay } from '@harmony/shared';

const TIME_LABEL: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
};

// Section 9.4. Tapping the check toggles the log, optimistic, no confirmation.
// Tapping the rest of the card opens the nested habit view in Phase 6; until
// then it is quietly inert rather than pointing somewhere fake.
export default function HabitCard({
  habit,
  area,
  done,
  onToggle,
}: {
  habit: Habit;
  area: Area;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-card bg-parchment-50 py-3 pl-3 pr-4 shadow-card"
      style={{ borderLeft: `3px solid ${area.color}` }}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Mark ${habit.name} not done` : `Mark ${habit.name} done`}
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full transition-colors"
        style={
          done
            ? { backgroundColor: area.color }
            : { boxShadow: 'inset 0 0 0 1.5px var(--parchment-300)' }
        }
      >
        {done && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </motion.button>

      <div className="min-w-0 flex-1">
        <p className={done ? 'truncate text-sm text-ink-300 line-through' : 'truncate text-sm text-ink-900'}>
          {habit.name}
        </p>
        <p className="truncate text-xs" style={{ color: area.color }}>
          {area.name}
        </p>
      </div>

      <span className="shrink-0 text-xs text-ink-300">{TIME_LABEL[habit.timeOfDay]}</span>
    </div>
  );
}
