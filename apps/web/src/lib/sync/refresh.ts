import { applyUpdateNow } from '../../appUpdate';
import { db } from '../db/schema';
import { flushOutbox, pullUserData } from '../supabase/sync';
import { useSyncStore } from './status';
import { useAreas } from '../../store/useAreas';
import { useHabits } from '../../store/useHabits';
import { useLogs } from '../../store/useLogs';
import { useSettings } from '../../store/useSettings';

// Reload the data stores from Dexie after a pull, so a screen that is already
// showing data picks up whatever changed in the local cache.
export function refreshStores(userId: string): void {
  void useAreas.getState().load(userId);
  void useHabits.getState().load(userId);
  void useLogs.getState().load(userId);
  void useSettings.getState().load();
}

// Background re-sync: pull from the cloud and refresh the UI, but only when
// online and nothing is mid-mirror, so the authoritative reconcile can't race
// a write that hasn't reached the server yet. Used by focus/online/poll. The
// pull is incremental (watermark-based for logs), so every one of these is both
// cheap and complete — it catches everything changed since the last sync.
export async function syncNow(userId: string): Promise<void> {
  if (!navigator.onLine) return;
  // Send any queued local writes up first, so the authoritative pull can't
  // reconcile-away a change that simply hasn't reached the server yet.
  await flushOutbox();
  if (useSyncStore.getState().pending > 0) return;
  // If the flush couldn't drain everything (e.g. a transient network error),
  // don't run the authoritative pull: it could reconcile-away a local write
  // that is still queued but hasn't reached the server. Retry next sync.
  if ((await db.outbox.count()) > 0) return;
  const ok = await pullUserData(userId);
  if (ok) refreshStores(userId);
}

// Explicit, user-initiated sync (the Sync data popup): push queued writes, pull
// the latest from the source database, then forcefully bring the app itself up
// to the newest deployed version. The two are separate layers — data vs. code —
// and a green "Synced" only ever meant the former; this makes the button also
// deliver the latter. applyUpdateNow drives a real worker swap (and, if the
// worker is wedged, a data-safe hard recover) so a newly shipped version lands
// without the user re-adding the home-screen icon. If it returns 'updating', a
// reload is imminent and this resolves as the page tears down.
export async function manualRefresh(userId: string | null): Promise<void> {
  if (userId && navigator.onLine) {
    await flushOutbox();
    // Same guard as syncNow: never let the authoritative pull race a queued
    // local write that hasn't reached the server yet.
    if ((await db.outbox.count()) === 0) {
      const ok = await pullUserData(userId);
      if (ok) refreshStores(userId);
    }
  }
  try {
    await applyUpdateNow();
  } catch {
    // A failed update check should never make the sync feel broken.
  }
}
