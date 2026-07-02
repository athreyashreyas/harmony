import { useRef } from 'react';
import { motion } from 'framer-motion';
import type { Area, Habit, TimeOfDay } from '@harmony/shared';
import TruncatedText from '../TruncatedText/TruncatedText';

const TIME_LABEL: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
};

const LONG_PRESS_MS = 500;

// Section 9.4 and 9.5. Tapping the check toggles the log (optimistic, no
// confirmation). Tapping the rest of the card opens the nested habit view.
// Long-pressing the card opens the note sheet for today.
export default function HabitCard({
  habit,
  area,
  done,
  onToggle,
  onOpen,
  onLongPress,
}: {
  habit: Habit;
  area: Area;
  done: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onLongPress: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLong = useRef(false);

  function startPress() {
    wasLong.current = false;
    timer.current = setTimeout(() => {
      wasLong.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }

  function endPress() {
    if (timer.current) clearTimeout(timer.current);
    if (!wasLong.current) onOpen();
  }

  function cancelPress() {
    if (timer.current) clearTimeout(timer.current);
  }

  // A habit shows its own colour when set, otherwise it inherits the area's.
  const accent = habit.color ?? area.color;

  return (
    <div
      className="flex items-center gap-3 rounded-card bg-parchment-50 py-3 pl-3 pr-4 shadow-card"
      style={{ borderLeft: `3px solid ${accent}` }}
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
            ? { backgroundColor: accent }
            : { boxShadow: 'inset 0 0 0 1.5px var(--parchment-300)' }
        }
      >
        {done && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </motion.button>

      <button
        type="button"
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={cancelPress}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onOpen();
        }}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <TruncatedText
            text={habit.name}
            className={done ? 'text-sm text-ink-300 line-through' : 'text-sm text-ink-900'}
          />
          <span className="block truncate text-xs" style={{ color: area.color }}>
            {area.name}
          </span>
        </span>

        <span className="shrink-0 text-xs text-ink-300">{TIME_LABEL[habit.timeOfDay]}</span>
      </button>
    </div>
  );
}
