import type { Area, Habit, Log, NotificationSettings } from '@harmony/shared';
import { DEFAULT_DND } from '@harmony/shared';
import { db, NOTIFICATION_SETTINGS_KEY } from './schema';
import { isoDaysAgo, todayISO } from '../time/dates';
import {
  mirrorAreaUpsert,
  mirrorHabitUpsert,
  mirrorLogDelete,
  mirrorLogUpsert,
  mirrorNotificationSettings,
} from '../supabase/sync';

// Dexie is the source of truth on device (section 6.2).

export async function areasForUser(userId: string): Promise<Area[]> {
  return db.areas.where('userId').equals(userId).toArray();
}

export async function activeAreasForUser(userId: string): Promise<Area[]> {
  const areas = await areasForUser(userId);
  return areas.filter((a) => a.archivedAt == null).sort((a, b) => a.order - b.order);
}

export async function habitsForUser(userId: string): Promise<Habit[]> {
  return db.habits.where('userId').equals(userId).toArray();
}

export async function activeHabitsForUser(userId: string): Promise<Habit[]> {
  const habits = await habitsForUser(userId);
  return habits.filter((h) => h.archivedAt == null).sort((a, b) => a.order - b.order);
}

// Trailing window of logs, inclusive of today. 60 days covers the Bloom's 14
// day activity ratio, the weekly counts, drift cadence (median gap over 60
// days), and the habit detail pattern observations, all from one load.
export async function recentLogsForUser(userId: string, windowDays = 60): Promise<Log[]> {
  const from = isoDaysAgo(windowDays);
  return db.logs.where('userId').equals(userId).and((log) => log.date >= from).toArray();
}

// Logs between two ISO dates, inclusive. Goes straight to Dexie rather than
// the trailing window the Home/Insights stores keep, since the Log calendar
// (section 12) can be browsed to any month, not just the last 60 days.
export async function logsInRange(userId: string, fromISO: string, toISO: string): Promise<Log[]> {
  return db.logs
    .where('userId')
    .equals(userId)
    .and((log) => log.date >= fromISO && log.date <= toISO)
    .toArray();
}

// Commits the full onboarding result in one transaction so areas and habits
// land together or not at all.
export async function saveOnboarding(areas: Area[], habits: Habit[]): Promise<void> {
  await db.transaction('rw', db.areas, db.habits, async () => {
    if (areas.length) await db.areas.bulkPut(areas);
    if (habits.length) await db.habits.bulkPut(habits);
  });
}

// Tap-to-log, optimistic (section 9.5). Logging twice on the same day for the
// same habit un-logs it. Returns the log that was created, or null if this
// call removed one.
export async function toggleLog(habit: Habit, dateISO: string = todayISO()): Promise<Log | null> {
  const existing = await db.logs
    .where('[habitId+date]')
    .equals([habit.id, dateISO])
    .first();

  if (existing) {
    await db.logs.delete(existing.id);
    void mirrorLogDelete(existing.id);
    return null;
  }

  const log: Log = {
    id: crypto.randomUUID(),
    userId: habit.userId,
    habitId: habit.id,
    areaId: habit.areaId,
    date: dateISO,
    loggedAt: Date.now(),
    note: null,
  };
  await db.logs.put(log);
  void mirrorLogUpsert(log);
  return log;
}

// Area create and edit share one write path (section 10 long-press edit
// sheet, and its create counterpart from the FAB).
export async function saveArea(area: Area): Promise<void> {
  await db.areas.put(area);
  void mirrorAreaUpsert(area);
}

// Archiving an area archives its habits too, so they cannot linger on Home
// after the area that gave them context is gone.
export async function archiveArea(areaId: string): Promise<void> {
  const area = await db.areas.get(areaId);
  if (!area) return;
  const archivedAt = Date.now();
  const habits = await db.habits.where('areaId').equals(areaId).toArray();

  await db.transaction('rw', db.areas, db.habits, async () => {
    await db.areas.put({ ...area, archivedAt });
    for (const habit of habits) {
      if (habit.archivedAt == null) await db.habits.put({ ...habit, archivedAt });
    }
  });

  void mirrorAreaUpsert({ ...area, archivedAt });
  for (const habit of habits) {
    if (habit.archivedAt == null) void mirrorHabitUpsert({ ...habit, archivedAt });
  }
}

// Persists a new priority order for the given areas (their array order is the
// new order) and mirrors it.
export async function reorderAreas(orderedAreas: Area[]): Promise<Area[]> {
  const updated = orderedAreas.map((area, i) => ({ ...area, order: i }));
  await db.areas.bulkPut(updated);
  for (const area of updated) void mirrorAreaUpsert(area);
  return updated;
}

export async function saveHabit(habit: Habit): Promise<void> {
  await db.habits.put(habit);
  void mirrorHabitUpsert(habit);
}

// Persists a new priority order for a set of habits (their array order is the
// new order). Used to reorder the habits within one area.
export async function reorderHabits(orderedHabits: Habit[]): Promise<Habit[]> {
  const updated = orderedHabits.map((habit, i) => ({ ...habit, order: i }));
  await db.habits.bulkPut(updated);
  for (const habit of updated) void mirrorHabitUpsert(habit);
  return updated;
}

export async function archiveHabit(habitId: string): Promise<void> {
  const habit = await db.habits.get(habitId);
  if (!habit) return;
  const archived = { ...habit, archivedAt: Date.now() };
  await db.habits.put(archived);
  void mirrorHabitUpsert(archived);
}

// All logs for one habit, oldest first. Drives the heatmap, the note thread,
// and the "last tended" line in the detail view (section 11), which need more
// than the trailing window the Home store keeps.
export async function logsForHabit(habitId: string): Promise<Log[]> {
  const logs = await db.logs.where('habitId').equals(habitId).toArray();
  return logs.sort((a, b) => a.date.localeCompare(b.date));
}

// Attaches or clears a note on a given day's log (section 9.5, the long-press
// note). Writing a note for a day that was not logged marks it tended too,
// since a note is a reflection on having done the habit. Returns the log when
// one exists afterward, or null when an empty note on an untended day was a
// no-op.
export async function setLogNote(
  habit: Habit,
  dateISO: string,
  note: string | null,
): Promise<Log | null> {
  const trimmed = note?.trim() ? note.trim() : null;
  const existing = await db.logs.where('[habitId+date]').equals([habit.id, dateISO]).first();

  if (!existing && !trimmed) return null;

  const log: Log = existing
    ? { ...existing, note: trimmed }
    : {
        id: crypto.randomUUID(),
        userId: habit.userId,
        habitId: habit.id,
        areaId: habit.areaId,
        date: dateISO,
        loggedAt: Date.now(),
        note: trimmed,
      };
  await db.logs.put(log);
  void mirrorLogUpsert(log);
  return log;
}

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  const defaults: NotificationSettings = {
    masterEnabled: true,
    mutedAreaIds: [],
    dndStart: DEFAULT_DND.start,
    dndEnd: DEFAULT_DND.end,
    habitReminders: true,
    dailySummary: true,
    theme: null,
  };
  const row = await db.settings.get(NOTIFICATION_SETTINGS_KEY);
  // Merge over defaults so settings saved before these fields existed still
  // read back complete.
  return row ? { ...defaults, ...(row.value as Partial<NotificationSettings>) } : defaults;
}

export async function saveNotificationSettings(userId: string, settings: NotificationSettings): Promise<void> {
  await db.settings.put({ key: NOTIFICATION_SETTINGS_KEY, value: settings });
  void mirrorNotificationSettings(userId, settings);
}
