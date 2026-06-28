import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { pullProfile } from '../lib/supabase/sync';
import { useUser } from '../store/useUser';

// Gates the protected routes (onboarding and the main shell). Listens for
// Supabase auth changes, hydrates the local profile, and redirects based on
// auth status and onboardedAt. Full-screen loading is allowed here only,
// since it is the first-auth case called out in section 20.
export default function AuthGate() {
  const status = useUser((s) => s.status);
  const profile = useUser((s) => s.profile);
  const setSignedIn = useUser((s) => s.setSignedIn);
  const setSignedOut = useUser((s) => s.setSignedOut);
  const location = useLocation();

  useEffect(() => {
    if (!supabase) {
      setSignedOut();
      return;
    }

    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const user = data.session?.user;
      if (!user) {
        setSignedOut();
        return;
      }
      const loadedProfile = await pullProfile(user.id);
      if (!active) return;
      if (loadedProfile) setSignedIn(loadedProfile);
      else setSignedOut();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      const user = session?.user;
      if (!user) {
        setSignedOut();
        return;
      }
      const loadedProfile = await pullProfile(user.id);
      if (!active) return;
      if (loadedProfile) setSignedIn(loadedProfile);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <span className="font-serif text-xl text-iris-500">harmony</span>
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
