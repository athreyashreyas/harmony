import { create } from 'zustand';
import type { UserProfile } from '@harmony/shared';

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

// Holds the current auth status, the local profile, and the account email.
// AuthGate is the only place that writes status; screens read it to decide
// what to show.
export const useUser = create<UserState>((set) => ({
  status: 'loading',
  profile: null,
  email: null,
  setSignedIn: (profile) => set({ status: 'signed-in', profile }),
  setSignedOut: () => set({ status: 'signed-out', profile: null, email: null }),
  updateProfile: (profile) => set({ profile }),
  setEmail: (email) => set({ email }),
}));
