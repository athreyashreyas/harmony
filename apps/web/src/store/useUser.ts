import { create } from 'zustand';
import type { UserProfile } from '@harmony/shared';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

interface UserState {
  status: AuthStatus;
  profile: UserProfile | null;
  setSignedIn: (profile: UserProfile) => void;
  setSignedOut: () => void;
  updateProfile: (profile: UserProfile) => void;
}

// Holds the current auth status and the local profile. AuthGate is the only
// place that writes status; screens read it to decide what to show.
export const useUser = create<UserState>((set) => ({
  status: 'loading',
  profile: null,
  setSignedIn: (profile) => set({ status: 'signed-in', profile }),
  setSignedOut: () => set({ status: 'signed-out', profile: null }),
  updateProfile: (profile) => set({ profile }),
}));
