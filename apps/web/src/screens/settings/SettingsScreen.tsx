import { supabase } from '../../lib/supabase/client';
import { useUser } from '../../store/useUser';

// The "Me" tab (settings, section 14). Account details, priority reorder, and
// notification preferences are a later phase. Phase 2 only needs sign out to
// be real.
export default function SettingsScreen() {
  const profile = useUser((s) => s.profile);
  const setSignedOut = useUser((s) => s.setSignedOut);

  async function handleSignOut() {
    await supabase?.auth.signOut();
    setSignedOut();
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8 pb-28 md:pb-12">
      <h1 className="font-serif text-3xl text-ink-900">Me</h1>
      {profile && <p className="mt-3 text-sm text-ink-300">Signed in as {profile.firstName}.</p>}

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-8 rounded-full bg-parchment-200 px-5 py-2.5 text-sm font-medium text-ink-700 hover:bg-parchment-300"
      >
        Sign out
      </button>
    </div>
  );
}
