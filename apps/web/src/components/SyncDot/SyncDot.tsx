import { motion } from 'framer-motion';
import { useSyncStore } from '../../lib/sync/status';

// Section 20: "a small dot in the corner shows offline, pending, or synced."
// No spinners. Sits in a fixed corner above all screens under the Shell.
export default function SyncDot() {
  const online = useSyncStore((s) => s.online);
  const pending = useSyncStore((s) => s.pending);

  const state = !online ? 'offline' : pending > 0 ? 'pending' : 'synced';
  const label =
    state === 'offline'
      ? 'Offline. Changes are saved on this device.'
      : state === 'pending'
        ? 'Saving...'
        : 'Synced';

  const color =
    state === 'offline' ? 'var(--ink-300)' : state === 'pending' ? 'var(--iris-500)' : 'var(--sage-500)';

  return (
    <div
      role="status"
      aria-label={label}
      title={label}
      className="pointer-events-none fixed z-40"
      style={{ top: 'calc(var(--safe-top) + 0.75rem)', right: 'calc(var(--safe-right) + 0.75rem)' }}
    >
      <motion.span
        className="block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
        animate={state === 'pending' ? { opacity: [0.4, 1, 0.4] } : { opacity: state === 'synced' ? 0.5 : 1 }}
        transition={state === 'pending' ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
      />
    </div>
  );
}
