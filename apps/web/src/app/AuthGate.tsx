import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { ensureSubscribed } from '../lib/push/subscribe';
import { hasLocalData, pullProfile, pullUserData, subscribeUserRealtime, type SyncTable } from '../lib/supabase/sync';
import { useSyncStore } from '../lib/sync/status';
import { useAreas } from '../store/useAreas';
import { useHabits } from '../store/useHabits';
import { useLogs } from '../store/useLogs';
import { useSettings } from '../store/useSettings';
import { useUser } from '../store/useUser';

// Reload the data stores from Dexie after a pull, so a device that was already
// showing data picks up anything fetched from the cloud.
function refreshStores(userId: string) {
  void useAreas.getState().load(userId);
  void useHabits.getState().load(userId);
  void useLogs.getState().load(userId);
  void useSettings.getState().load();
}

// A safe re-sync: pull from the cloud and refresh the UI, but only when online
// and nothing is mid-mirror (so the authoritative reconcile can't race a write
// that hasn't reached the server yet).
async function syncNow(userId: string) {
  if (!navigator.onLine) return;
  if (useSyncStore.getState().pending > 0) return;
  const ok = await pullUserData(userId);
  if (ok) refreshStores(userId);
}

// Gates the protected routes (onboarding and the main shell). Listens for
// Supabase auth changes, hydrates the local profile, and redirects based on
// auth status and onboardedAt. Full-screen loading is allowed here only,
// since it is the first-auth case called out in section 20.
export default function AuthGate() {
  const status = useUser((s) => s.status);
  const profile = useUser((s) => s.profile);
  const setSignedIn = useUser((s) => s.setSignedIn);
  const setSignedOut = useUser((s) => s.setSignedOut);
  const setEmail = useUser((s) => s.setEmail);
  const location = useLocation();

  useEffect(() => {
    if (!supabase) {
      setSignedOut();
      return;
    }

    let active = true;

    // Hydrate the local cache from the cloud. On a fresh context (empty local
    // DB, e.g. a newly installed PWA) block so Home does not flash empty;
    // otherwise refresh in the background so an active device stays current.
    const hydrate = async (userId: string) => {
      try {
        if (await hasLocalData(userId)) {
          void pullUserData(userId).then((ok) => {
            if (ok && active) refreshStores(userId);
          });
        } else {
          await pullUserData(userId);
        }
      } catch (err) {
        console.warn('Failed to hydrate local data from the cloud.', err);
      }
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const user = data.session?.user;
      if (!user) {
        setSignedOut();
        return;
      }
      setEmail(user.email ?? null);
      try {
        const loadedProfile = await pullProfile(user.id);
        if (!active) return;
        if (!loadedProfile) {
          setSignedOut();
          return;
        }
        await hydrate(user.id);
        if (!active) return;
        setSignedIn(loadedProfile);
      } catch (err) {
        console.error('Failed to load profile after session check.', err);
        if (active) setSignedOut();
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      const user = session?.user;
      if (!user) {
        setSignedOut();
        return;
      }
      setEmail(user.email ?? null);
      try {
        const loadedProfile = await pullProfile(user.id);
        if (!active) return;
        if (!loadedProfile) return;
        await hydrate(user.id);
        if (!active) return;
        setSignedIn(loadedProfile);
      } catch (err) {
        console.error('Failed to load profile after auth state change.', err);
        if (active) setSignedOut();
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync from the cloud whenever a signed-in device is brought back to the
  // foreground or reconnects, so opening another device (or returning to this
  // one) reflects writes made elsewhere, including deletes and un-logs.
  useEffect(() => {
    if (status !== 'signed-in' || !profile) return;
    const userId = profile.id;

    // Instant cross-device updates: apply each remote change to Dexie and
    // reload just the affected store.
    const refreshTable = (table: SyncTable) => {
      if (table === 'areas') void useAreas.getState().load(userId);
      else if (table === 'habits') void useHabits.getState().load(userId);
      else if (table === 'logs') void useLogs.getState().load(userId);
      else void useSettings.getState().load();
    };
    const unsubscribe = subscribeUserRealtime(userId, refreshTable);

    // Self-heal this device's push subscription if permission is granted but the
    // backend row is missing (e.g. an earlier subscribe failed silently).
    void ensureSubscribed(userId);

    // Backstops for anything realtime might miss (dropped socket, sleep): pull
    // on foreground, on reconnect, and a gentle poll while visible.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow(userId);
    };
    const onOnline = () => void syncNow(userId);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void syncNow(userId);
    }, 60_000);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.clearInterval(interval);
    };
  }, [status, profile]);

  if (!isSupabaseConfigured) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center px-5 pt-safe pb-safe text-center">
        <h1 className="font-serif text-2xl text-ink-900">Supabase is not configured.</h1>
        <p className="mt-3 max-w-sm text-sm text-ink-500">
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to apps/web/.env.local, then restart
          the dev server.
        </p>
      </main>
    );
  }

  if (status === 'loading') {
    return (
      <main className="flex min-h-full items-center justify-center pt-safe pb-safe">
        <span className="font-serif text-xl text-iris-500">Harmony</span>
      </main>
    );
  }

  if (status === 'signed-out') {
    return <Navigate to="/sign-in" replace />;
  }

  if (profile?.onboardedAt == null && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (profile?.onboardedAt != null && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
