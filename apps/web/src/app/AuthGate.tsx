import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { APP_VERSION } from '../lib/changelog';
import { ensureSubscribed } from '../lib/push/subscribe';
import { flushOutbox, hasLocalData, pullProfile, pullUserData, subscribeUserRealtime, type SyncTable } from '../lib/supabase/sync';
import { refreshStores, syncNow } from '../lib/sync/refresh';
import { useTheme } from '../lib/theme/theme';
import { useAreas } from '../store/useAreas';
import { useHabits } from '../store/useHabits';
import { useLogs } from '../store/useLogs';
import { useSettings } from '../store/useSettings';
import { useUser } from '../store/useUser';

// True if `a` is a strictly newer semver ("x.y.z") than `b`.
function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
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
  // The theme carried on the synced settings row. When it arrives from another
  // device (via pull or realtime), apply it here so the look stays in step.
  const syncedTheme = useSettings((s) => s.notifications?.theme);
  const settings = useSettings((s) => s.notifications);
  const updateSettings = useSettings((s) => s.update);
  const navigate = useNavigate();
  const location = useLocation();
  const whatsNewHandled = useRef(false);

  useEffect(() => {
    if (syncedTheme && syncedTheme !== useTheme.getState().themeId) {
      useTheme.getState().setTheme(syncedTheme);
    }
  }, [syncedTheme]);

  // Show "What's new" once when the account first meets a newer app version, then
  // record that version on the synced settings row so it isn't shown again, on
  // this device or any other. Handled once per app session.
  useEffect(() => {
    if (whatsNewHandled.current) return;
    if (status !== 'signed-in' || !profile?.onboardedAt) return;
    if (!settings) return; // wait for settings to hydrate
    if (location.pathname === '/onboarding' || location.pathname === '/guide') return;

    const seen = settings.lastSeenVersion ?? null;
    if (seen && !isNewerVersion(APP_VERSION, seen)) return; // already seen this (or newer)

    whatsNewHandled.current = true;
    void updateSettings(profile.id, { lastSeenVersion: APP_VERSION });
    navigate('/guide?pane=new');
  }, [status, profile, settings, location.pathname, navigate, updateSettings]);

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
        // Send any writes queued offline before pulling, so the authoritative
        // reconcile sees them on the server rather than deleting them locally.
        await flushOutbox();
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
    // on foreground, on reconnect, and a slow safety-net poll while visible.
    // Realtime carries live updates, and foreground/reconnect catch the common
    // gaps, so this only needs to be the rare-miss net; a long interval keeps it
    // from re-fetching the whole account every minute.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow(userId);
    };
    const onOnline = () => void syncNow(userId);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    const POLL_MS = 5 * 60_000;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void syncNow(userId);
    }, POLL_MS);

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

  // Just-finished (or already) onboarded but still on /onboarding: send them to
  // the guide, the intended first stop after setup. This is also the redirect
  // that wins the brief race in finish() between the profile update and the
  // navigation, so a new user reliably lands on the guide, not home.
  if (profile?.onboardedAt != null && location.pathname === '/onboarding') {
    return <Navigate to="/guide?pane=guide" replace />;
  }

  return <Outlet />;
}
