import { motion } from 'framer-motion';
import { useSyncStore } from '../../lib/sync/status';

// Status indicator (section 20). Three states, theme-warm:
//   red    offline (changes saved on-device)
//   gold   syncing (writing to or reading from the cloud)
//   green  all synced
// It sits in a small frosted chip so it always rests on its own surface and
// never visually collides with a card border underneath. pointer-events-none so
// it never blocks taps.
const STATES = {
  offline: { color: '#c0392b', label: 'Offline. Changes are saved on this device.' },
  syncing: { color: '#b7902a', label: 'Syncing with the cloud...' },
  synced: { color: 'var(--sage-500)', label: 'All synced.' },
} as const;

export default function SyncDot() {
  const online = useSyncStore((s) => s.online);
  const pending = useSyncStore((s) => s.pending);

  const key = !online ? 'offline' : pending > 0 ? 'syncing' : 'synced';
  const { color, label } = STATES[key];

  return (
    <div
      role="status"
      aria-label={label}
      title={label}
      className="pointer-events-none fixed z-40 rounded-full bg-parchment-50/80 p-1 shadow-[0_1px_4px_rgba(35,25,15,0.12)] ring-1 ring-parchment-200 backdrop-blur-sm"
      style={{ top: 'calc(var(--safe-top) + 0.6rem)', right: 'calc(var(--safe-right) + 0.6rem)' }}
    >
      <motion.span
        className="block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
        animate={
          key === 'syncing'
            ? { opacity: [0.45, 1, 0.45], scale: [0.9, 1, 0.9] }
            : { opacity: 1, scale: 1 }
        }
        transition={
          key === 'syncing' ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }
        }
      />
    </div>
  );
}
