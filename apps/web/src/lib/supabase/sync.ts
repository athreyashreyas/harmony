import type { Table } from 'dexie';
import type { Area, Habit, Log, NotificationSettings, NudgeHistory, UserProfile } from '@harmony/shared';
import { supabase } from './client';
import { db } from '../db/schema';
import { withSync } from '../sync/status';

// Getting a profile row to and from Supabase, with Dexie as the on-device
// cache, plus best-effort mirroring of areas, habits, and logs. Full
// bi-directional reconciliation for multi-device use is a later phase; for
// now writes go to Dexie first (source of truth) and mirror out, fire and
// forget.

interface ProfileRow {
  id: string;
  first_name: string;
  onboarded_at: string | null;
  timezone: string;
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    firstName: row.first_name,
    onboardedAt: row.onboarded_at ? new Date(row.onboarded_at).getTime() : null,
    timezone: row.timezone,
  };
}

export async function createProfile(input: {
  id: string;
  firstName: string;
  timezone: string;
}): Promise<UserProfile> {
  const profile: UserProfile = {
    id: input.id,
    firstName: input.firstName,
    onboardedAt: null,
    timezone: input.timezone,
  };

  if (supabase) {
    const { error } = await supabase.from('profiles').insert({
      id: profile.id,
      first_name: profile.firstName,
      onboarded_at: null,
      timezone: profile.timezone,
    });
    if (error) throw error;
  }

  await db.profile.put(profile);
  return profile;
}

export async function pullProfile(userId: string): Promise<UserProfile | null> {
  const cached = await db.profile.get(userId);
  if (cached) return cached;

  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, onboarded_at, timezone')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const profile = rowToProfile(data);
  await db.profile.put(profile);
  return profile;
}

export async function markOnboarded(userId: string): Promise<void> {
  const onboardedAt = Date.now();

  if (supabase) {
    const { error } = await supabase
      .from('profiles')
      .update({ onboarded_at: new Date(onboardedAt).toISOString() })
      .eq('id', userId);
    if (error) throw error;
  }

  const existing = await db.profile.get(userId);
  if (existing) {
    await db.profile.put({ ...existing, onboardedAt });
  }
}

function areaToRow(a: Area) {
  return {
    id: a.id,
    user_id: a.userId,
    name: a.name,
    color: a.color,
    importance: a.importance,
    why_sentence: a.whySentence,
    sort_order: a.order,
    created_at: new Date(a.createdAt).toISOString(),
    archived_at: a.archivedAt ? new Date(a.archivedAt).toISOString() : null,
    drift_sensitivity: a.driftSensitivity ?? 'default',
    reminder_time_of_day: a.reminderTimeOfDay ?? 'anytime',
  };
}

function habitToRow(h: Habit) {
  return {
    id: h.id,
    user_id: h.userId,
    area_id: h.areaId,
    name: h.name,
    cadence: h.cadence,
    time_of_day: h.timeOfDay,
    reminder_time: h.reminderTime,
    start_date: h.startDate,
    end_date: h.endDate,
    sort_order: h.order,
    created_at: new Date(h.createdAt).toISOString(),
    archived_at: h.archivedAt ? new Date(h.archivedAt).toISOString() : null,
    color: h.color ?? null,
  };
}

// Best-effort mirror of the onboarding result to Supabase. Failures are
// swallowed: Dexie already holds the source of truth, and reconciliation
// happens in the background later.
export async function mirrorOnboarding(areas: Area[], habits: Habit[]): Promise<void> {
  const client = supabase;
  if (!client) return;
  await withSync(async () => {
    try {
      if (areas.length) {
        const { error } = await client.from('areas').upsert(areas.map(areaToRow));
        if (error) throw error;
      }
      if (habits.length) {
        const { error } = await client.from('habits').upsert(habits.map(habitToRow));
        if (error) throw error;
      }
    } catch (err) {
      console.warn('Onboarding mirror to Supabase failed, will reconcile later.', err);
    }
  });
}

function logToRow(log: Log) {
  return {
    id: log.id,
    user_id: log.userId,
    habit_id: log.habitId,
    area_id: log.areaId,
    date: log.date,
    logged_at: new Date(log.loggedAt).toISOString(),
    note: log.note,
  };
}

export async function mirrorLogUpsert(log: Log): Promise<void> {
  const client = supabase;
  if (!client) return;
  await withSync(async () => {
    try {
      const { error } = await client.from('logs').upsert(logToRow(log));
      if (error) throw error;
    } catch (err) {
      console.warn('Log mirror to Supabase failed, will reconcile later.', err);
    }
  });
}

export async function mirrorLogDelete(logId: string): Promise<void> {
  const client = supabase;
  if (!client) return;
  await withSync(async () => {
    try {
      const { error } = await client.from('logs').delete().eq('id', logId);
      if (error) throw error;
    } catch (err) {
      console.warn('Log delete mirror to Supabase failed, will reconcile later.', err);
    }
  });
}

// Single row mirrors for the edit flows (Phase 5): area and habit create,
// edit, archive, and reorder all funnel through these.
export async function mirrorAreaUpsert(area: Area): Promise<void> {
  const client = supabase;
  if (!client) return;
  await withSync(async () => {
    try {
      const { error } = await client.from('areas').upsert(areaToRow(area));
      if (error) throw error;
    } catch (err) {
      console.warn('Area mirror to Supabase failed, will reconcile later.', err);
    }
  });
}

export async function mirrorHabitUpsert(habit: Habit): Promise<void> {
  const client = supabase;
  if (!client) return;
  await withSync(async () => {
    try {
      const { error } = await client.from('habits').upsert(habitToRow(habit));
      if (error) throw error;
    } catch (err) {
      console.warn('Habit mirror to Supabase failed, will reconcile later.', err);
    }
  });
}

function nudgeToRow(n: NudgeHistory) {
  return {
    id: n.id,
    user_id: n.userId,
    template_id: n.templateId,
    area_id: n.areaId,
    habit_id: n.habitId,
    composed_text: n.composedText,
    sent_at: new Date(n.sentAt).toISOString(),
    channel: n.channel,
  };
}

export async function mirrorNudge(nudge: NudgeHistory): Promise<void> {
  const client = supabase;
  if (!client) return;
  await withSync(async () => {
    try {
      const { error } = await client.from('nudge_history').upsert(nudgeToRow(nudge));
      if (error) throw error;
    } catch (err) {
      console.warn('Nudge mirror to Supabase failed, will reconcile later.', err);
    }
  });
}

function notificationSettingsToRow(userId: string, s: NotificationSettings) {
  return {
    user_id: userId,
    master_enabled: s.masterEnabled,
    muted_area_ids: s.mutedAreaIds,
    dnd_start: s.dndStart,
    dnd_end: s.dndEnd,
    habit_reminders: s.habitReminders,
    daily_summary: s.dailySummary,
  };
}

export async function mirrorNotificationSettings(userId: string, settings: NotificationSettings): Promise<void> {
  const client = supabase;
  if (!client) return;
  await withSync(async () => {
    try {
      const { error } = await client
        .from('notification_settings')
        .upsert(notificationSettingsToRow(userId, settings));
      if (error) throw error;
    } catch (err) {
      console.warn('Notification settings mirror to Supabase failed, will reconcile later.', err);
    }
  });
}

// --- Pull (hydrate local cache from the cloud) -----------------------------
// The mirror functions above push local writes up. These pull the account's
// data down so a fresh device or a separate storage context (notably an iOS
// home-screen PWA, which has its own IndexedDB separate from Safari) shows the
// same data instead of an empty Home. Merge is by id (upsert); full
// delete/conflict reconciliation is still a later phase.

interface AreaRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  importance: Area['importance'];
  why_sentence: string;
  sort_order: number;
  created_at: string;
  archived_at: string | null;
  drift_sensitivity: Area['driftSensitivity'];
  reminder_time_of_day: Area['reminderTimeOfDay'];
}

interface HabitRow {
  id: string;
  user_id: string;
  area_id: string;
  name: string;
  cadence: Habit['cadence'];
  time_of_day: Habit['timeOfDay'];
  reminder_time: string | null;
  start_date: string;
  end_date: string | null;
  sort_order: number;
  created_at: string;
  archived_at: string | null;
  color: string | null;
}

interface LogRow {
  id: string;
  user_id: string;
  habit_id: string;
  area_id: string;
  date: string;
  logged_at: string;
  note: string | null;
}

interface SettingsRow {
  master_enabled: boolean;
  muted_area_ids: string[] | null;
  dnd_start: string;
  dnd_end: string;
  habit_reminders: boolean | null;
  daily_summary: boolean | null;
}

const NOTIFICATION_SETTINGS_KEY = 'notificationSettings';

function rowToArea(r: AreaRow): Area {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    color: r.color,
    importance: r.importance,
    whySentence: r.why_sentence,
    order: r.sort_order,
    createdAt: new Date(r.created_at).getTime(),
    archivedAt: r.archived_at ? new Date(r.archived_at).getTime() : null,
    driftSensitivity: r.drift_sensitivity ?? undefined,
    reminderTimeOfDay: r.reminder_time_of_day ?? undefined,
  };
}

function rowToHabit(r: HabitRow): Habit {
  return {
    id: r.id,
    userId: r.user_id,
    areaId: r.area_id,
    name: r.name,
    cadence: r.cadence,
    timeOfDay: r.time_of_day,
    reminderTime: r.reminder_time,
    startDate: r.start_date,
    endDate: r.end_date,
    order: r.sort_order,
    createdAt: new Date(r.created_at).getTime(),
    archivedAt: r.archived_at ? new Date(r.archived_at).getTime() : null,
    color: r.color ?? undefined,
  };
}

function rowToLog(r: LogRow): Log {
  return {
    id: r.id,
    userId: r.user_id,
    habitId: r.habit_id,
    areaId: r.area_id,
    date: r.date,
    loggedAt: new Date(r.logged_at).getTime(),
    note: r.note,
  };
}

// True once the local cache has at least one area for this user, i.e. this
// device/context has been hydrated before.
export async function hasLocalData(userId: string): Promise<boolean> {
  return (await db.areas.where('userId').equals(userId).count()) > 0;
}

// How recent a local row must be to be shielded from deletion during a
// reconcile. A row missing from the server is treated as "deleted elsewhere"
// only if it is older than this; newer rows are assumed to be a just-made local
// write whose mirror may still be in flight (or briefly offline), so they are
// kept rather than wiped.
const RECONCILE_GRACE_MS = 2 * 60 * 1000;

// Makes the server authoritative for one table, safely: upsert every server
// row, and delete local rows the server no longer has, except ones written
// within the grace window. This is what propagates deletes and un-toggles
// across devices, not just additions.
async function reconcileTable<T extends { id: string; userId: string }>(
  table: Table<T, string>,
  userId: string,
  serverRows: T[],
  writtenAt: (row: T) => number,
): Promise<void> {
  const serverIds = new Set(serverRows.map((r) => r.id));
  const cutoff = Date.now() - RECONCILE_GRACE_MS;
  const local = await table.where('userId').equals(userId).toArray();
  const stale = local.filter((r) => !serverIds.has(r.id) && writtenAt(r) < cutoff).map((r) => r.id);
  if (stale.length) await table.bulkDelete(stale);
  if (serverRows.length) await table.bulkPut(serverRows);
}

// Fetch areas, habits, and logs for the user from Supabase and reconcile them
// into Dexie (server authoritative, with the grace window above). Returns false
// if Supabase isn't configured or the fetch failed, so the caller can proceed
// with whatever is local.
export async function pullUserData(userId: string): Promise<boolean> {
  const client = supabase;
  if (!client) return false;

  return withSync(async () => {
    const [areasRes, habitsRes, logsRes, settingsRes] = await Promise.all([
      client.from('areas').select('*').eq('user_id', userId),
      client.from('habits').select('*').eq('user_id', userId),
      client.from('logs').select('*').eq('user_id', userId),
      client.from('notification_settings').select('*').eq('user_id', userId).maybeSingle(),
    ]);
    if (areasRes.error || habitsRes.error || logsRes.error) {
      console.warn('Pull from Supabase failed.', areasRes.error ?? habitsRes.error ?? logsRes.error);
      return false;
    }

    const areas = (areasRes.data as AreaRow[]).map(rowToArea);
    const habits = (habitsRes.data as HabitRow[]).map(rowToHabit);
    const logs = (logsRes.data as LogRow[]).map(rowToLog);

    await db.transaction('rw', db.areas, db.habits, db.logs, async () => {
      await reconcileTable(db.areas, userId, areas, (a) => a.createdAt);
      await reconcileTable(db.habits, userId, habits, (h) => h.createdAt);
      await reconcileTable(db.logs, userId, logs, (l) => l.loggedAt);
    });

    // Notification settings: mirror the cloud copy down so per-device config
    // (mute, quiet hours, the reminder toggles) stays in agreement.
    const s = settingsRes.data as SettingsRow | null;
    if (s) {
      const settings: NotificationSettings = {
        masterEnabled: s.master_enabled,
        mutedAreaIds: s.muted_area_ids ?? [],
        dndStart: s.dnd_start,
        dndEnd: s.dnd_end,
        habitReminders: s.habit_reminders ?? true,
        dailySummary: s.daily_summary ?? true,
      };
      await db.settings.put({ key: NOTIFICATION_SETTINGS_KEY, value: settings });
    }
    return true;
  });
}

// Deletes everything the signed in user can reach under row level security
// (logs, habits, areas, nudge history, notification settings, profile). The
// underlying auth.users row cannot be removed from the client without a
// service role key, which must never ship to the browser, so this is the
// honest scope of an in-app "delete account": all of the user's data, with
// sign out following immediately after.
export async function deleteAllUserData(userId: string): Promise<void> {
  if (supabase) {
    await supabase.from('logs').delete().eq('user_id', userId);
    await supabase.from('nudge_history').delete().eq('user_id', userId);
    await supabase.from('habits').delete().eq('user_id', userId);
    await supabase.from('areas').delete().eq('user_id', userId);
    await supabase.from('notification_settings').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);
  }
  await db.delete();
}
