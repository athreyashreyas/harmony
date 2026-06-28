import { create } from 'zustand';
import type { NotificationSettings } from '@harmony/shared';
import { loadNotificationSettings, saveNotificationSettings } from '../lib/db/queries';

interface SettingsState {
  notifications: NotificationSettings | null;
  load: () => Promise<void>;
  update: (userId: string, next: Partial<NotificationSettings>) => Promise<void>;
}

// Notification preferences (section 14). Loaded once into Dexie's generic
// settings table; the worker (Phase 11) reads the Supabase mirror.
export const useSettings = create<SettingsState>((set, get) => ({
  notifications: null,
  load: async () => {
    const notifications = await loadNotificationSettings();
    set({ notifications });
  },
  update: async (userId, next) => {
    const current = get().notifications ?? (await loadNotificationSettings());
    const merged = { ...current, ...next };
    set({ notifications: merged });
    await saveNotificationSettings(userId, merged);
  },
}));
