import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface SortOption<T extends string> {
  value: T;
  label: string;
  // A short line under the label explaining what the order does, so choices like
  // "Still to do" read clearly rather than cryptically.
  description: string;
}

// A small, themed dropdown for the Home sort control. It stands in for the OS
// <select> so the menu wears the app's paper, ink, and shadows instead of the
// system's chrome. Tap the trigger to open a calm popover of options, each with
// a one-line description; tapping one (or outside, or Escape) closes it.
export default function SortMenu<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SortOption<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.value === value) ?? options[0];

  // Close on any tap outside, or on Escape, like a native menu would.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Sort habits"
        className="flex items-center gap-1.5 text-ink-500"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6h13M4 12h9M4 18h5" />
        </svg>
        <span className="text-xs font-medium">{active.label}</span>
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Sort habits by"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-0 top-full z-20 mt-2 w-60 origin-top-left overflow-hidden rounded-card border border-parchment-300/60 bg-parchment-50 p-1 shadow-lift"
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
                      <span className={['block text-sm', selected ? 'font-semibold text-ink-900' : 'font-medium text-ink-700'].join(' ')}>
                        {o.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-ink-300">{o.description}</span>
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
