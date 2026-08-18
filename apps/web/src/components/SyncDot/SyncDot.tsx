import { useState } from 'react';
import { motion } from 'framer-motion';
import Modal from '../Modal/Modal';
import { APP_VERSION } from '../../lib/changelog';
import { manualRefresh } from '../../lib/sync/refresh';
import { useSyncStore } from '../../lib/sync/status';
import { useUser } from '../../store/useUser';

// Status indicator + sync popup (section 20). Three theme-warm states:
//   red    offline (changes saved on-device)
//   gold   syncing (pushing up or pulling down)
//   green  all synced
// Anchored to the top-right of each tab's own scrolling content (its root is
// `relative`), not the viewport, so it rides with the page instead of hovering:
// to sync, scroll to the top and tap it. The offset is a single shared constant
// so the dot lands at the exact same spot on every tab — no drift when switching
// sections, even though Home's header (a date line + smaller greeting) differs
// from the others. The dot is bare, on a transparent hit area sized for a
// thumb, so it reads the same way it does in the rest of the suite. Tapping it
// opens a popup to sync on demand (and pick up a new app version) without
// closing and reopening the app.
const STATES = {
  offline: {
    color: '#c0392b',
    label: 'Offline',
    heading: "You're offline",
    body: 'Your changes are saved on this device and will sync the moment you reconnect. Nothing is lost.',
  },
  syncing: {
    color: '#b7902a',
    label: 'Syncing',
    heading: 'Syncing your data',
    body: 'Sending up anything new and pulling the latest from your account.',
  },
  synced: {
    color: 'var(--sage-base)',
    label: 'Synced',
    heading: "Everything's up to date",
    body: 'Your habits are in sync across your devices.',
  },
} as const;

export default function SyncDot() {
  const online = useSyncStore((s) => s.online);
  const pending = useSyncStore((s) => s.pending);
  const profile = useUser((s) => s.profile);

  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const syncing = running || pending > 0;
  const key = !online ? 'offline' : syncing ? 'syncing' : 'synced';
  const state = STATES[key];

  async function handleSync() {
    if (!online || running) return;
    setRunning(true);
    try {
      await manualRefresh(profile?.id ?? null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Sync status: ${state.label}. Open to sync.`}
        className="absolute right-2.5 top-7 z-10 grid h-8 w-8 place-items-center rounded-full"
      >
        <motion.span
          className="block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: state.color }}
          animate={key === 'syncing' ? { opacity: [0.45, 1, 0.45], scale: [0.9, 1, 0.9] } : { opacity: 1, scale: 1 }}
          transition={key === 'syncing' ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Sync">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: state.color }} />
            <span className="text-sm font-medium text-ink-strong">{state.heading}</span>
          </div>
          <p className="text-sm text-ink-muted">{state.body}</p>

          {online ? (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="w-full rounded-full bg-accent-base py-3 text-sm font-medium text-on-accent transition-opacity disabled:opacity-40"
            >
              {syncing ? 'Syncing...' : key === 'synced' ? 'Sync again' : 'Sync now'}
            </button>
          ) : (
            <p className="text-xs text-ink-faint">
              Connect to the internet to sync. We'll keep your changes safe here until then, and send
              them up on their own once you're back.
            </p>
          )}

          <p className="text-center text-xs text-ink-faint">
            Harmony {APP_VERSION}. Syncing also checks for a new version.
          </p>
        </div>
      </Modal>
    </>
  );
}
