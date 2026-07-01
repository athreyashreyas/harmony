import { motion } from 'framer-motion';

// A calm, themed cover shown while the app settles on open: auth resolving, the
// first cloud pull landing, the theme applying, and the "What's new" decision.
// It hides the sync churn so the app is only revealed once it looks right (the
// correct theme applied, and either the home screen or What's new). The colours
// come from the CSS variables, so it already wears the active theme.
//
// The logo is static (no entrance animation) so this can mount/unmount across
// the loading -> settled handover without any visible flicker; only the soft
// pulse beneath it moves. It fades out as a whole when the app is ready.
export default function Splash() {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-parchment-100"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
    >
      <div className="flex flex-col items-center gap-5">
        <img
          src="/icons/icon-192.png"
          alt=""
          width={76}
          height={76}
          className="shadow-card"
          style={{ borderRadius: '19px' }}
        />
        <motion.span
          className="block h-1.5 w-16 rounded-full"
          style={{ backgroundColor: 'var(--iris-500)' }}
          animate={{ opacity: [0.25, 0.7, 0.25], scaleX: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}
