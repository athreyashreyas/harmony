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
// a write that hasn't reached the server yet. Used by focus/online/poll.
export async function syncNow(userId: string): Promise<void> {
  if (!navigator.onLine) return;
  // Send any queued local writes up first, so the authoritative pull can't
  // reconcile-away a change that simply hasn't reached the server yet.
  await flushOutbox();
  if (useSyncStore.getState().pending > 0) return;
  const ok = await pullUserData(userId);
  if (ok) refreshStores(userId);
}

// Explicit, user-initiated sync (the Sync data popup): push queued writes, pull
// the latest from the source database, and ask the service worker to check for
// a new app version. Resolves when it has done what it can.
export async function manualRefresh(userId: string | null): Promise<void> {
  if (userId && navigator.onLine) {
    await flushOutbox();
    const ok = await pullUserData(userId);
    if (ok) refreshStores(userId);
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
  } catch {
    // A failed update check should never make the sync feel broken.
  }
}
