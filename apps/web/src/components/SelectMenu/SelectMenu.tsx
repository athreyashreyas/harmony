import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDismiss } from '../../lib/useDismiss';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

// A general app dropdown for when there are too many choices for a segmented
// control (frequency, area). Stands in for an OS <select>, wearing the app's
// paper, ink, and shadows, and matching the SortMenu's feel.
export default function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));
  const active = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex w-full items-center justify-between rounded-card bg-parchment-50/90 px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-parchment-300"
      >
        <span>{active?.label}</span>
        <motion.svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-ink-300" aria-hidden="true" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 origin-top overflow-y-auto rounded-card border border-parchment-300/60 bg-parchment-50 p-1 shadow-lift"
          >
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <li key={o.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={[
                      'flex w-full items-start gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors',
                      selected ? 'bg-parchment-200' : 'hover:bg-parchment-100',
                    ].join(' ')}
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      {selected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--iris-500)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className={['block text-sm', selected ? 'font-semibold text-ink-900' : 'font-medium text-ink-700'].join(' ')}>{o.label}</span>
                      {o.description && <span className="mt-0.5 block text-xs leading-snug text-ink-300">{o.description}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
