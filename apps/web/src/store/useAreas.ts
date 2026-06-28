import { create } from 'zustand';
import type { Area } from '@harmony/shared';
import { activeAreasForUser } from '../lib/db/queries';

interface AreasState {
  areas: Area[];
  loadedFor: string | null;
  load: (userId: string) => Promise<void>;
}

// Active areas for the signed in user, ordered by priority. Reorder and edit
// flows arrive in Phase 5; Home only reads this.
export const useAreas = create<AreasState>((set) => ({
  areas: [],
  loadedFor: null,
  load: async (userId) => {
    const areas = await activeAreasForUser(userId);
    set({ areas, loadedFor: userId });
  },
}));
