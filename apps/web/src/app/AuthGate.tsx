import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { APP_VERSION } from '../lib/changelog';
import { ensureSubscribed } from '../lib/push/subscribe';
import { flushOutbox, hasLocalData, pullProfile, pullUserData, subscribeUserRealtime, type SyncTable } from '../lib/supabase/sync';
import { refreshStores, syncNow } from '../lib/sync/refresh';
import { useTheme } from '../lib/theme/theme';
import { getSeenVersionLocal, isNewerVersion, setSeenVersionLocal } from '../lib/whatsNew';
import Splash from '../components/Splash/Splash';
import { useAreas } from '../store/useAreas';
import { useHabits } from '../store/useHabits';
import { useLogs } from '../store/useLogs';
import { useSettings } from '../store/useSettings';
import { useUser } from '../store/useUser';

// How long the splash stays at minimum, so a fast boot doesn't flash-and-vanish.
// Long enough to clearly register as one calm screen; if the boot takes longer,
// the splash simply stays until it's done.
const MIN_SPLASH_MS = 1500;

// Gates the protected routes (onboarding and the main shell). Listens for
// Supabase auth changes, hydrates the local profile, and redirects based on
// auth status and onboardedAt. A calm Splash covers the whole boot (auth, the
// first cloud pull, theme, and the "What's new" decision) so the sync churn is
// never seen; the app is revealed only once it looks right.
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

  // `synced` flips once this session's first cloud pull has landed, so the
  // "What's new" decision reads a fresh (not stale) lastSeenVersion. `ready`
  // drops the splash once the boot has fully settled. `booted` guards the
  // one-time decision.
  const [synced, setSynced] = useState(false);
  const [ready, setReady] = useState(false);
  const [floorPassed, setFloorPassed] = useState(false);
  const booted = useRef(false);

  // Is this open a genuinely new version for this device? Decided synchronously
  // from the locally-remembered seen version (no network), so the common case —
  // reopening on a version already seen — never shows the update screen and never
  // waits on the floor. It lands straight on Home; the cloud pull still runs in
  // the background. The update screen (with its floor) is reserved for an actual
  // version bump, where the calm wait covers the fresh sync.
  const updatePending = useRef(isNewerVersion(APP_VERSION, getSeenVersionLocal()));

  // On an update, the update screen stays for at least MIN_SPLASH_MS so the fresh
  // sync doesn't flash-and-vanish; if the boot takes longer, it simply stays.
  useEffect(() => {
    if (!updatePending.current) return;
    const t = window.setTimeout(() => setFloorPassed(true), MIN_SPLASH_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (syncedTheme && syncedTheme !== useTheme.getState().themeId) {
      useTheme.getState().setTheme(syncedTheme);
    }
  }, [syncedTheme]);

  useEffect(() => {
    if (!supabase) {
      setSignedOut();
      return;
    }

    let active = true;

    // Hydrate the local cache from the cloud, then flag `synced` so the boot can
    // decide on fresh data. A returning device shows its cached data under the
    // splash while the pull lands; a fresh device waits for it.
    const hydrate = async (userId: string) => {
      try {
        // Send any writes queued offline before pulling, so the authoritative
        // reconcile sees them on the server rather than deleting them locally.
        await flushOutbox();
        if (await hasLocalData(userId)) {
          void pullUserData(userId).then((ok) => {
            if (!active) return;
            if (ok) refreshStores(userId);
            else void useSettings.getState().load();
            setSynced(true);
          });
        } else {
          const ok = await pullUserData(userId);
          if (!active) return;
          if (ok) refreshStores(userId);
          else void useSettings.getState().load();
          setSynced(true);
        }
      } catch (err) {
        console.warn('Failed to hydrate local data from the cloud.', err);
        if (active) {
          void useSettings.getState().load();
          setSynced(true);
        }
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

  // Load settings from the local cache as soon as we're signed in, so they are
  // never null for long (the fresh pull then updates them, and `synced` gates the
  // decision on that fresh value).
  useEffect(() => {
    if (status === 'signed-in') void useSettings.getState().load();
  }, [status]);

  // Safety net: never let the splash hang if a pull never resolves.
  useEffect(() => {
    if (status !== 'signed-in') return;
    const t = window.setTimeout(() => setSynced(true), 6000);
    return () => window.clearTimeout(t);
  }, [status]);

  // The one-time boot decision: once auth + the fresh pull + settings have
  // settled, show "What's new" if this is genuinely a newer version for this
  // account AND this device (checked against both the synced marker and a
  // per-device one, so a pull that briefly resets the synced value can't
  // re-trigger it), then reveal the app.
  useEffect(() => {
    if (booted.current) return;
    if (status === 'signed-out') {
      setReady(true);
      return;
    }
    if (status !== 'signed-in' || !profile) return;
    if (!profile.onboardedAt) {
      // Onboarding presents its own screens; no splash over them.
      setReady(true);
      return;
    }

    // No new version for this device: reveal Home right away and let the cloud
    // pull catch up in the background. This is the common reopen, kept lag-free.
    if (!updatePending.current) {
      booted.current = true;
      setReady(true);
      return;
    }

    // A genuine new version: hold the update screen until the fresh pull lands,
    // so the "What's new" decision reads a current lastSeenVersion.
    if (!synced || !settings) return;

    booted.current = true;
    const onAppRoute = location.pathname !== '/onboarding' && location.pathname !== '/guide';
    const seenLocal = getSeenVersionLocal();
    const seenSynced = settings.lastSeenVersion ?? null;
    const isNew = isNewerVersion(APP_VERSION, seenLocal) && isNewerVersion(APP_VERSION, seenSynced);

    if (isNew) {
      setSeenVersionLocal(APP_VERSION);
      void updateSettings(profile.id, { lastSeenVersion: APP_VERSION });
      if (onAppRoute) navigate('/guide?pane=new');
    } else {
      // Seen elsewhere already: quietly bring both markers up to date.
      if (isNewerVersion(APP_VERSION, seenLocal)) setSeenVersionLocal(APP_VERSION);
      if (isNewerVersion(APP_VERSION, seenSynced)) void updateSettings(profile.id, { lastSeenVersion: APP_VERSION });
    }
    setReady(true);
  }, [status, profile, synced, settings, location.pathname, navigate, updateSettings]);

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
    // Just the launch logo while auth resolves (usually instant from the cached
    // session); the "Updating" label is reserved for an actual version bump.
    return <Splash label={updatePending.current ? 'Updating Harmony' : undefined} />;
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

  // On a version bump, the update screen covers the app until the boot has
  // settled (and the floor has passed), then fades to reveal the right screen
  // (Home, or What's new). On an ordinary reopen there's no overlay at all, so
  // Home shows immediately with no wait.
  return (
    <>
      <Outlet />
      <AnimatePresence>
        {updatePending.current && (!ready || !floorPassed) && <Splash label="Updating Harmony" />}
      </AnimatePresence>
    </>
  );
}
