import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDismiss } from '../../lib/useDismiss';

// Formats a 24h "HH:mm" as a friendly 12h clock, e.g. "8:05 AM".
export function formatClock(value: string): string {
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

function parse(value: string | null): { h12: number; minute: number; period: 'AM' | 'PM' } {
  if (!value) return { h12: 8, minute: 0, period: 'AM' };
  const [h, m] = value.split(':').map(Number);
  return { h12: h % 12 || 12, minute: m || 0, period: h >= 12 ? 'PM' : 'AM' };
}

function to24(h12: number, minute: number, period: 'AM' | 'PM'): string {
  const h = period === 'PM' ? (h12 % 12) + 12 : h12 % 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

// An app time picker: a trigger showing the chosen time, opening a popover with
// tappable hour / minute columns and an AM·PM toggle. Replaces the OS time input
// so setting a reminder keeps the app's look and touch feel.
export default function TimeField({
  value,
  onChange,
  placeholder = 'Set a time',
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));

  const cur = parse(value);
  const set = (next: Partial<typeof cur>) => {
    const merged = { ...cur, ...next };
    onChange(to24(merged.h12, merged.minute, merged.period));
  };

  const cellBase = 'flex h-9 items-center justify-center rounded-[10px] text-sm transition-colors';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-card bg-parchment-50/90 px-3.5 py-2.5 text-sm ring-1 ring-inset ring-parchment-300"
      >
        <span className={value ? 'text-ink-900' : 'text-ink-300'}>{value ? formatClock(value) : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink-300" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Choose a time"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full z-30 mt-2 origin-top rounded-card border border-parchment-300/60 bg-parchment-50 p-3 shadow-lift"
          >
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="mb-1.5 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Hour</p>
                <div className="grid max-h-40 grid-cols-3 gap-1 overflow-y-auto pr-0.5">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => set({ h12: h })}
                      className={[cellBase, cur.h12 === h ? 'bg-iris-500 text-on-primary' : 'text-ink-700 hover:bg-parchment-100'].join(' ')}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <p className="mb-1.5 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Min</p>
                <div className="grid max-h-40 grid-cols-3 gap-1 overflow-y-auto pr-0.5">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => set({ minute: m })}
                      className={[cellBase, cur.minute === m ? 'bg-iris-500 text-on-primary' : 'text-ink-700 hover:bg-parchment-100'].join(' ')}
                    >
                      {String(m).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex w-14 flex-col">
                <p className="mb-1.5 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">&nbsp;</p>
                <div className="flex flex-col gap-1">
                  {(['AM', 'PM'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set({ period: p })}
                      className={[cellBase, cur.period === p ? 'bg-iris-500 text-on-primary' : 'text-ink-700 hover:bg-parchment-100'].join(' ')}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button type="button" onClick={() => { onChange(null); setOpen(false); }} className="text-xs font-medium text-ink-500">
                Clear
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-parchment-200 px-3.5 py-1.5 text-xs font-medium text-ink-900">
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
