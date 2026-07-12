import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Area } from '@harmony/shared';
import type { CelebrationMeta } from '../../lib/celebrate/useCelebrations';
import { hexToRgba } from '../../lib/color';
import { spring } from '../../lib/motion';

// A gentle note that rises above the tab bar when one or more sections reach
// full bloom, to congratulate the person and commend their consistency. It
// pairs with the confetti (lib/celebrate) but stands on its own, so the message
// still lands when motion is reduced. Auto-dismisses; tap to send it away early.

const VISIBLE_MS = 5000;
// The whole-Bloom moment is rarer and grander; let it linger a touch longer.
const VISIBLE_GRAND_MS = 6500;

// Warm, plain lines in the app's voice. The milestone moments come first: the
// whole wheel in bloom, then a person's very first bloom, then the everyday
// one-or-more.
function words(areas: Area[], meta: CelebrationMeta): { title: string; body: string } {
  if (meta.allBloom) {
    return {
      title: 'Your whole life is in full bloom',
      body: 'Every area, all at once. This is a rare and lovely thing.',
    };
  }
  if (meta.firstEver) {
    return {
      title: `${areas[0].name} is your first full bloom`,
      body: "You tended it all the way there. Here's to the first of many.",
    };
  }
  if (areas.length === 1) {
    return {
      title: `${areas[0].name} is in full bloom`,
      body: "You've tended it steadily. Lovely, consistent work.",
    };
  }
  return {
    title: `${areas.length} areas in full bloom`,
    body: "You're showing up right across your life. Beautifully done.",
  };
}

export default function CelebrationToast({
  celebration,
  onDismiss,
}: {
  // The sections just celebrated and how, or null when nothing is showing.
  celebration: { areas: Area[]; meta: CelebrationMeta } | null;
  onDismiss: () => void;
}) {
  const areas = celebration?.areas ?? null;
  const meta = celebration?.meta ?? null;

  // Restart the auto-dismiss timer whenever a new celebration arrives. Keyed on
  // the celebration reference, which Home replaces with a fresh object each time.
  useEffect(() => {
    if (!celebration) return;
    const t = window.setTimeout(onDismiss, meta?.allBloom ? VISIBLE_GRAND_MS : VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [celebration, meta, onDismiss]);

  const accent = areas && areas.length > 0 ? areas[0].color : '#000000';
  const copy = areas && meta ? words(areas, meta) : null;

  return (
    <AnimatePresence>
      {areas && copy && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 z-[90] flex justify-center px-4"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={spring}
        >
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss celebration"
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-card bg-parchment-50 px-4 py-3 text-left shadow-sheet"
            style={{ borderLeft: `3px solid ${accent}` }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
              style={{ backgroundColor: hexToRgba(accent, 0.16) }}
              aria-hidden="true"
            >
              🌸
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-serif text-sm text-ink-900">{copy.title}</span>
              <span className="block text-xs leading-snug text-ink-500">{copy.body}</span>
            </span>
            {/* A little row of the celebrated sections' colours. */}
            <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
              {areas.slice(0, 4).map((a) => (
                <span key={a.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: a.color }} />
              ))}
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
