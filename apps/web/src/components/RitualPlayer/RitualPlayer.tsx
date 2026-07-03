import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Area, Habit, Ritual } from '@harmony/shared';
import WatercolorWash from '../WatercolorWash/WatercolorWash';
import { ritualHabits } from '../../lib/rituals';

// The ritual flow: a calm, full-screen sequence you move through tap by tap.
// One habit at a time, a big circle to complete it, then it eases to the next.
// Habits already done today start complete, so a mid-morning run just continues.
export default function RitualPlayer({
  open,
  ritual,
  habits,
  areas,
  doneIds,
  onToggle,
  onClose,
}: {
  open: boolean;
  ritual: Ritual | null;
  habits: Habit[];
  areas: Area[];
  doneIds: Set<string>;
  onToggle: (habit: Habit) => void;
  onClose: () => void;
}) {
  const steps = useMemo(() => (ritual ? ritualHabits(ritual, habits) : []), [ritual, habits]);
  const colorOf = useMemo(() => {
    const areaColor = new Map(areas.map((a) => [a.id, a.color]));
    return (h: Habit) => h.color ?? areaColor.get(h.areaId) ?? '#5a636f';
  }, [areas]);

  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  // Guards the brief post-tap animation so a rapid double-tap on the complete
  // circle can't queue two advances and skip a step. Cleared on step change and
  // when the player (re)opens.
  const advancing = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setIndex(0);
      setFinished(false);
    }
  }, [open, ritual]);

  // Clear any pending advance timer on unmount (or when the player closes), so
  // it can't fire against a torn-down player.
  useEffect(() => () => {
    if (advancing.current) clearTimeout(advancing.current);
  }, []);

  if (!open || !ritual) return null;

  const current = steps[index];
  const done = current ? doneIds.has(current.id) : false;
  const color = current ? colorOf(current) : '#5a636f';

  const advance = () => {
    if (advancing.current) {
      clearTimeout(advancing.current);
      advancing.current = null;
    }
    if (index < steps.length - 1) setIndex((i) => i + 1);
    else setFinished(true);
  };
  const complete = () => {
    if (advancing.current) return; // a transition is already in flight
    if (current && !doneIds.has(current.id)) onToggle(current);
    advancing.current = setTimeout(() => {
      advancing.current = null;
      advance();
    }, 460);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] flex flex-col bg-parchment-100 pt-safe pb-safe"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="relative flex items-center justify-between px-5 py-4">
          <span className="text-sm font-medium text-ink-500">{ritual.name}</span>
          <button type="button" onClick={onClose} aria-label="Close ritual" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-parchment-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Progress dots. */}
        {!finished && steps.length > 0 && (
          <div className="flex justify-center gap-1.5 px-5">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className="h-1.5 rounded-full transition-all"
                style={{ width: i === index ? 20 : 6, backgroundColor: i <= index ? color : 'var(--parchment-300)' }}
              />
            ))}
          </div>
        )}

        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
          <WatercolorWash color={color} height={420} />
          <AnimatePresence mode="wait">
            {finished || !current ? (
              <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative flex flex-col items-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
                </span>
                <h2 className="mt-6 font-serif text-2xl text-ink-900">Ritual complete</h2>
                <p className="mt-2 max-w-xs text-sm text-ink-500">That's {ritual.name.toLowerCase()} done. A good way to meet the day.</p>
                <button type="button" onClick={onClose} className="mt-8 rounded-full bg-ink-900 px-6 py-2.5 text-sm font-medium text-parchment-50">
                  Done
                </button>
              </motion.div>
            ) : (
              <motion.div key={index} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.24 }} className="relative flex flex-col items-center">
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-300">
                  Step {index + 1} of {steps.length}
                </span>
                <h2 className="mt-3 max-w-sm font-serif text-3xl leading-tight text-ink-900">{current.name}</h2>

                <button
                  type="button"
                  onClick={complete}
                  aria-label={done ? 'Done' : `Complete ${current.name}`}
                  className="mt-10 flex h-28 w-28 items-center justify-center rounded-full transition-transform active:scale-95"
                  style={done ? { backgroundColor: color } : { boxShadow: `inset 0 0 0 2px ${color}` }}
                >
                  <motion.svg
                    key={done ? 'on' : 'off'}
                    initial={{ scale: done ? 0.5 : 1, opacity: done ? 0 : 1 }}
                    animate={{ scale: 1, opacity: 1 }}
                    width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={done ? '#fff' : color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </motion.svg>
                </button>
                <p className="mt-5 text-sm text-ink-500">{done ? 'Done. Tap to continue.' : 'Tap when you have done it.'}</p>

                <button type="button" onClick={advance} className="mt-6 text-sm font-medium text-ink-300">
                  {index < steps.length - 1 ? 'Skip for now' : 'Finish'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
