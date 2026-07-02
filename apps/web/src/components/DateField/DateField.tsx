import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDismiss } from '../../lib/useDismiss';
import { formatMonthYear, monthGrid, todayISO } from '../../lib/time/dates';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Friendly label for the trigger, e.g. "Jun 12, 2026".
function formatShort(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// An app calendar picker: a trigger showing the chosen date, opening a month
// grid to tap a day, with prev/next month arrows. Replaces the OS date input so
// choosing start/end dates keeps the app's look and touch feel. `min` disables
// earlier days (used so an end date can't fall before its start).
export default function DateField({
  value,
  onChange,
  min,
  placeholder = 'Pick a date',
}: {
  value: string | null;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));

  // The month the grid is showing; starts on the selected date's month.
  const [cursor, setCursor] = useState(() => new Date(`${value ?? todayISO()}T00:00:00`));
  const rows = useMemo(() => monthGrid(cursor), [cursor]);
  const today = todayISO();

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-card bg-parchment-50/90 px-3.5 py-2.5 text-sm ring-1 ring-inset ring-parchment-300"
      >
        <span className={value ? 'text-ink-900' : 'text-ink-300'}>{value ? formatShort(value) : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink-300" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v3M16 3v3" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Choose a date"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full z-30 mt-2 origin-top rounded-card border border-parchment-300/60 bg-parchment-50 p-3 shadow-lift"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-parchment-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <span className="text-sm font-medium text-ink-900">{formatMonthYear(cursor)}</span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-parchment-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEKDAY_INITIALS.map((d, i) => (
                <span key={i} className="text-center text-[10px] font-medium text-ink-300">{d}</span>
              ))}
            </div>

            <div className="space-y-1">
              {rows.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((dateISO, di) => {
                    if (!dateISO) return <span key={di} />;
                    const selected = dateISO === value;
                    const isToday = dateISO === today;
                    const disabled = min != null && dateISO < min;
                    return (
                      <button
                        key={di}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          onChange(dateISO);
                          setOpen(false);
                        }}
                        className={[
                          'flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors',
                          selected
                            ? 'bg-iris-500 text-on-primary'
                            : disabled
                              ? 'text-ink-300/40'
                              : isToday
                                ? 'text-ink-900 ring-1 ring-inset ring-iris-400/60 hover:bg-parchment-100'
                                : 'text-ink-700 hover:bg-parchment-100',
                        ].join(' ')}
                      >
                        {Number(dateISO.slice(-2))}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
