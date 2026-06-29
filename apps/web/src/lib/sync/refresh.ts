import { pullUserData } from '../supabase/sync';
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
  if (useSyncStore.getState().pending > 0) return;
  const ok = await pullUserData(userId);
  if (ok) refreshStores(userId);
}
