import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Release } from '../../lib/changelog';
import { formatDateMedium } from '../../lib/time/dates';
import GuideArt from '../GuideArt/GuideArt';

// One expandable release in the Settings "What's new" list. Tapping the row
// reveals its notes. Major (feature) releases are tinted and badged.
export default function ReleaseRow({ release, defaultOpen }: { release: Release; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={
        release.major
          ? 'overflow-hidden rounded-card bg-iris-50 ring-1 ring-iris-100'
          : 'overflow-hidden rounded-card bg-parchment-100'
      }
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3.5 text-left"
      >
        <span className="shrink-0 rounded-full bg-iris-100 px-2 py-0.5 text-[11px] font-semibold text-iris-700">
          {release.version}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-medium text-ink-900">{release.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-500">{formatDateMedium(release.date)}</span>
            {release.major && (
              <span className="rounded-full bg-iris-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-parchment-50">
                Major
              </span>
            )}
          </span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-ink-300"
          aria-hidden="true"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="space-y-2 px-3.5">
              {release.notes.map((note, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-iris-400" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
            {release.art && release.art.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-4 px-3.5">
                {release.art.map((kind) => (
                  <div key={kind} className="flex items-center justify-center rounded-card bg-parchment-50/70 px-4 py-4 shadow-card">
                    <GuideArt kind={kind} />
                  </div>
                ))}
              </div>
            )}
            <div className="h-3.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
