import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Habit, Log } from '@harmony/shared';

// A tap on a habit used to update the store twice: once optimistically, then
// again to swap in the id Dexie had generated for the same row. The second
// update replaced the logs array for no visible change, and every replacement
// costs a full Home re-render plus another pass of the drift effect (a Dexie
// read and a scan of the log window) -- landing mid-way through the card's
// layout animation. These pin the tap to a single update.

const toggleLog = vi.fn();
vi.mock('../../apps/web/src/lib/db/queries', () => ({
  toggleLog: (...args: unknown[]) => toggleLog(...args),
  recentLogsForUser: vi.fn(async () => []),
  setLogNote: vi.fn(async () => null),
}));

const HABIT = { id: 'habit-1', userId: 'user-1', areaId: 'area-1' } as Habit;
const DATE = '2026-08-29';

async function loadStore() {
  vi.resetModules();
  const { useLogs } = await import('../../apps/web/src/store/useLogs');
  return useLogs;
}

/** Count how many times the logs array identity changes across one call. */
function countUpdates(useLogs: Awaited<ReturnType<typeof loadStore>>) {
  let updates = 0;
  let previous = useLogs.getState().logs;
  const unsubscribe = useLogs.subscribe((state) => {
    if (state.logs !== previous) {
      previous = state.logs;
      updates += 1;
    }
  });
  return { count: () => updates, unsubscribe };
}

beforeEach(() => toggleLog.mockReset());
afterEach(() => vi.restoreAllMocks());

describe('logging a habit', () => {
  it('writes under the id already shown, so the row on screen is the row stored', async () => {
    const useLogs = await loadStore();
    toggleLog.mockImplementation(async (_h: Habit, date: string, newId: string) => ({
      id: newId,
      userId: 'user-1',
      habitId: 'habit-1',
      areaId: 'area-1',
      date,
      loggedAt: Date.now(),
      note: null,
    }) as Log);

    await useLogs.getState().toggle(HABIT, DATE);

    const [, , passedId] = toggleLog.mock.calls[0];
    expect(passedId).toBeTruthy();
    expect(useLogs.getState().logs[0].id).toBe(passedId);
  });

  it('updates the list once, not twice, so nothing re-renders mid-animation', async () => {
    const useLogs = await loadStore();
    toggleLog.mockImplementation(async (_h: Habit, date: string, newId: string) => ({
      id: newId,
      userId: 'user-1',
      habitId: 'habit-1',
      areaId: 'area-1',
      date,
      loggedAt: Date.now(),
      note: null,
    }) as Log);

    const watch = countUpdates(useLogs);
    await useLogs.getState().toggle(HABIT, DATE);
    watch.unsubscribe();

    expect(watch.count()).toBe(1);
    expect(useLogs.getState().logs).toHaveLength(1);
  });

  it('un-logging also updates once and leaves the day empty', async () => {
    const useLogs = await loadStore();
    toggleLog.mockImplementation(async () => null);
    useLogs.setState({
      logs: [
        { id: 'existing', userId: 'user-1', habitId: 'habit-1', areaId: 'area-1', date: DATE, loggedAt: 1, note: null },
      ],
    });

    const watch = countUpdates(useLogs);
    await useLogs.getState().toggle(HABIT, DATE);
    watch.unsubscribe();

    expect(watch.count()).toBe(1);
    expect(useLogs.getState().logs).toHaveLength(0);
  });

  it('still corrects itself when the write disagrees with the optimistic guess', async () => {
    // Dexie found a row the store did not know about, so it deleted instead of
    // creating. The store must follow the write, not its own guess.
    const useLogs = await loadStore();
    toggleLog.mockImplementation(async () => null);

    await useLogs.getState().toggle(HABIT, DATE);

    expect(useLogs.getState().logs).toHaveLength(0);
  });
});
