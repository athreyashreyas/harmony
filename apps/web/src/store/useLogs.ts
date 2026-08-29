import { create } from 'zustand';
import type { Habit, Log } from '@harmony/shared';
import { recentLogsForUser, setLogNote, toggleLog as toggleLogInDb } from '../lib/db/queries';
import { todayISO } from '../lib/time/dates';

interface LogsState {
  logs: Log[];
  loadedFor: string | null;
  load: (userId: string) => Promise<void>;
  toggle: (habit: Habit, dateISO?: string) => Promise<void>;
  setNote: (habit: Habit, note: string, dateISO?: string) => Promise<void>;
}

// A trailing window of logs (section 9.5, tap-to-log). Writes go to Dexie
// first inside toggleLogInDb, then this store updates immediately so the
// check, the count, and the Bloom redraw all happen before any network
// round trip (section 20, optimistic everywhere).
export const useLogs = create<LogsState>((set, get) => ({
  logs: [],
  loadedFor: null,
  load: async (userId) => {
    const logs = await recentLogsForUser(userId);
    set({ logs, loadedFor: userId });
  },
  toggle: async (habit, dateISO = todayISO()) => {
    const existing = get().logs.find((l) => l.habitId === habit.id && l.date === dateISO);

    // Optimistic update first, under an id the write will reuse.
    const optimisticId = crypto.randomUUID();
    if (existing) {
      set({ logs: get().logs.filter((l) => l.id !== existing.id) });
    } else {
      const optimistic: Log = {
        id: optimisticId,
        userId: habit.userId,
        habitId: habit.id,
        areaId: habit.areaId,
        date: dateISO,
        loggedAt: Date.now(),
        note: null,
      };
      set({ logs: [...get().logs, optimistic] });
    }

    const result = await toggleLogInDb(habit, dateISO, optimisticId);

    // Reconcile only when the write actually disagreed with the guess, which
    // happens if Dexie's view of the day differed (a rapid double tap, or a
    // change synced in mid-write). Setting unconditionally replaced the array
    // on every tap for no change, and each replacement costs a full re-render
    // of Home plus another pass of the drift effect, which reads Dexie and
    // scans the log window. That landed in the middle of the card's layout
    // animation, which is where the dropped frames came from.
    const current = get().logs;
    const settled = current.find((l) => l.habitId === habit.id && l.date === dateISO) ?? null;
    if ((result?.id ?? null) === (settled?.id ?? null)) return;

    const withoutThisDay = current.filter((l) => !(l.habitId === habit.id && l.date === dateISO));
    set({ logs: result ? [...withoutThisDay, result] : withoutThisDay });
  },
  setNote: async (habit, note, dateISO = todayISO()) => {
    const result = await setLogNote(habit, dateISO, note);
    const withoutThisDay = get().logs.filter((l) => !(l.habitId === habit.id && l.date === dateISO));
    set({ logs: result ? [...withoutThisDay, result] : withoutThisDay });
  },
}));
