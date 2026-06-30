import { create } from 'zustand';
import type { UserProfile } from '@harmony/shared';
import { db, NOTIFICATION_SETTINGS_KEY, PUSH_PROMPT_DISMISSED_KEY } from '../lib/db/schema';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

interface UserState {
  status: AuthStatus;
  profile: UserProfile | null;
  // The auth account email, stashed at sign-in so screens (e.g. Me) can show
  // it instantly without a per-screen network fetch.
  email: string | null;
  setSignedIn: (profile: UserProfile) => void;
  setSignedOut: () => void;
  updateProfile: (profile: UserProfile) => void;
  setEmail: (email: string | null) => void;
}

// Onboarding draft, step, and a pending name are kept in localStorage so a
// reload can resume. They are NOT per-user, so they must be cleared at the
// user boundary (sign-out), or a different account on the same browser would
// inherit the previous person's half-finished onboarding. Keys mirror those in
// OnboardingContext / OnboardingFlow / SignUpScreen.
function clearOnboardingStorage() {
  try {
    localStorage.removeItem('harmony.onboardingDraft');
    localStorage.removeItem('harmony.onboardingStep');
    localStorage.removeItem('harmony.pendingFirstName');
  } catch {
    // ignore
  }
}

// These Dexie settings rows are per-device, not per-user (a single key each),
// so they must be cleared at sign-out or the next account on this device would
// inherit the previous person's notification preferences and dismissed prompt.
// A returning user re-hydrates their own from the cloud on sign-in.
function clearPerDeviceSettings() {
  void db.settings.delete(NOTIFICATION_SETTINGS_KEY);
  void db.settings.delete(PUSH_PROMPT_DISMISSED_KEY);
}

// Holds the current auth status, the local profile, and the account email.
// AuthGate is the only place that writes status; screens read it to decide
// what to show.
export const useUser = create<UserState>((set) => ({
  status: 'loading',
  profile: null,
  email: null,
  setSignedIn: (profile) => set({ status: 'signed-in', profile }),
  setSignedOut: () => {
    clearOnboardingStorage();
    clearPerDeviceSettings();
    set({ status: 'signed-out', profile: null, email: null });
  },
  updateProfile: (profile) => set({ profile }),
  setEmail: (email) => set({ email }),
}));
