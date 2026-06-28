import { create } from 'zustand';

// Backs the sync dot (section 20: "a small dot in the corner shows offline,
// pending, or synced", not a spinner). `online` tracks the browser's network
// state; `pending` counts in-flight Supabase mirror calls, incremented and
// decremented around each one in supabase/sync.ts.
interface SyncStore {
  online: boolean;
  pending: number;
  setOnline: (online: boolean) => void;
  begin: () => void;
  end: () => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: 0,
  setOnline: (online) => set({ online }),
  begin: () => set((s) => ({ pending: s.pending + 1 })),
  end: () => set((s) => ({ pending: Math.max(0, s.pending - 1) })),
}));

export function initSyncStatus(): void {
  window.addEventListener('online', () => useSyncStore.getState().setOnline(true));
  window.addEventListener('offline', () => useSyncStore.getState().setOnline(false));
}

// Wraps one Supabase mirror call so the dot reflects it while in flight.
export async function withSync<T>(fn: () => Promise<T>): Promise<T> {
  useSyncStore.getState().begin();
  try {
    return await fn();
  } finally {
    useSyncStore.getState().end();
  }
}
