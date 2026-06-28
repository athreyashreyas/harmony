import { create } from 'zustand';
import type { Habit } from '@harmony/shared';
import { activeHabitsForUser } from '../lib/db/queries';

interface HabitsState {
  habits: Habit[];
  loadedFor: string | null;
  load: (userId: string) => Promise<void>;
}

export const useHabits = create<HabitsState>((set) => ({
  habits: [],
  loadedFor: null,
  load: async (userId) => {
    const habits = await activeHabitsForUser(userId);
    set({ habits, loadedFor: userId });
  },
}));
