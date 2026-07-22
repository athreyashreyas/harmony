import { motion } from 'framer-motion';

// The boot/sync screen: the app icon on the active theme's paper, with an
// optional breathing label. With no label it's a plain launch screen (the common
// case, shown only while auth resolves); with "Updating Harmony" it's the update
// screen, shown only when a genuinely new version is coming up. The same visual
// is mirrored in index.html (pre-React) and pwa.ts (during a version swap), so
// the update -> reload -> boot sequence reads as one screen that simply stays,
// then fades to reveal the app.
//
// The logo is static so mounts/unmounts across the handover never flicker; only
// the label breathes. It fades out as a whole once the app is ready.
export default function Splash({ label }: { label?: string }) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-parchment-100"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
    >
      <img
        src="/icons/logo-192.png"
        alt=""
        width={80}
        height={80}
        className="shadow-card"
        style={{ borderRadius: '20px' }}
      />
      {label && (
        <motion.p
          className="text-sm font-medium text-ink-500"
          animate={{ opacity: [0.4, 0.85, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {label}
        </motion.p>
      )}
    </motion.div>
  );
}
