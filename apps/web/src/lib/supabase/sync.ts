import type { Table } from 'dexie';
import type { Area, Habit, Log, NotificationSettings, NudgeHistory, UserProfile } from '@harmony/shared';
import { supabase } from './client';
import { db, NOTIFICATION_SETTINGS_KEY, type OutboxItem } from '../db/schema';
import { withSync } from '../sync/status';

// The cloud side of the data layer. Dexie is the source of truth on device;
// this module moves data between it and Supabase three ways:
//   - mirror: every local write is queued in a durable outbox and drained up
//     in order, so a write made offline (or one that fails) is retried, not lost;
//   - pull: fetch the account's rows and reconcile them into Dexie, with the
//     server authoritative (a grace window shields just-made local writes);
//   - realtime: apply each remote change as it happens for instant cross-device
//     updates, with the pull above as the backstop.
// Account deletion and a local wipe (sign-out) live at the bottom.

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
    polarity: h.polarity ?? 'tend',
    tug_weight: h.tugWeight ?? null,
    weight: h.weight ?? null,
  };
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

function notificationSettingsToRow(userId: string, s: NotificationSettings) {
  return {
    user_id: userId,
    master_enabled: s.masterEnabled,
    muted_area_ids: s.mutedAreaIds,
    dnd_start: s.dndStart,
    dnd_end: s.dndEnd,
    habit_reminders: s.habitReminders,
    daily_summary: s.dailySummary,
    theme: s.theme ?? null,
  };
}

// --- Outbox (durable, offline-tolerant writes) -----------------------------
// Every write goes to Dexie first (source of truth) and is queued here, then a
// flusher drains it to Supabase in order. A write made offline, or one whose
// request fails, stays queued and is retried, instead of being lost.

async function enqueue(item: Omit<OutboxItem, 'id' | 'createdAt'>): Promise<void> {
  await db.outbox.add({ ...item, createdAt: Date.now() });
  void flushOutbox();
}

let flushing = false;

// Drains the outbox to Supabase in insertion order. Stops (and keeps the rest)
// on a network error so it can retry later; drops an item the server actively
// rejects so one bad write can't block the queue forever. Returns when it can
// make no further progress.
export async function flushOutbox(): Promise<void> {
  const client = supabase;
  if (!client || flushing || !navigator.onLine) return;
  flushing = true;
  try {
    for (;;) {
      if (!navigator.onLine) break;
      const item = await db.outbox.orderBy('id').first();
      if (!item) break;

      const result = await withSync(async () => {
        let error: { code?: string } | null = null;
        if (item.op === 'delete') {
          if (item.table === 'logs') {
            ({ error } = await client.from('logs').delete().eq('id', item.payload.id as string));
          }
        } else {
          ({ error } = await client
            .from(item.table)
            .upsert(item.payload, item.onConflict ? { onConflict: item.onConflict } : undefined));
        }
        if (!error) return 'ok' as const;
        // A PostgrestError (server reached, request rejected) carries a code;
        // a bare network failure does not. Drop the former, retry the latter.
        if (error.code) {
          console.warn('Outbox item rejected by server, dropping.', item.table, item.op, error);
          return 'drop' as const;
        }
        console.warn('Outbox flush hit a network error, will retry.', error);
        return 'retry' as const;
      });

      if (result === 'retry') break;
      await db.outbox.delete(item.id!);
    }
  } finally {
    flushing = false;
  }
}

export async function mirrorOnboarding(areas: Area[], habits: Habit[]): Promise<void> {
  for (const area of areas) await enqueue({ op: 'upsert', table: 'areas', payload: areaToRow(area) });
  for (const habit of habits) await enqueue({ op: 'upsert', table: 'habits', payload: habitToRow(habit) });
}

export async function mirrorLogUpsert(log: Log): Promise<void> {
  await enqueue({ op: 'upsert', table: 'logs', payload: logToRow(log) });
}

export async function mirrorLogDelete(logId: string): Promise<void> {
  await enqueue({ op: 'delete', table: 'logs', payload: { id: logId } });
}

export async function mirrorAreaUpsert(area: Area): Promise<void> {
  await enqueue({ op: 'upsert', table: 'areas', payload: areaToRow(area) });
}

export async function mirrorHabitUpsert(habit: Habit): Promise<void> {
  await enqueue({ op: 'upsert', table: 'habits', payload: habitToRow(habit) });
}

export async function mirrorNudge(nudge: NudgeHistory): Promise<void> {
  await enqueue({ op: 'upsert', table: 'nudge_history', payload: nudgeToRow(nudge) });
}

export async function mirrorNotificationSettings(userId: string, settings: NotificationSettings): Promise<void> {
  await enqueue({
    op: 'upsert',
    table: 'notification_settings',
    payload: notificationSettingsToRow(userId, settings),
    onConflict: 'user_id',
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
  polarity: Habit['polarity'] | null;
  tug_weight: number | null;
  weight: number | null;
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
  theme: string | null;
}

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
    polarity: r.polarity ?? 'tend',
    tugWeight: r.tug_weight ?? undefined,
    weight: r.weight ?? undefined,
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

function rowToSettings(s: SettingsRow): NotificationSettings {
  return {
    masterEnabled: s.master_enabled,
    mutedAreaIds: s.muted_area_ids ?? [],
    dndStart: s.dnd_start,
    dndEnd: s.dnd_end,
    habitReminders: s.habit_reminders ?? true,
    dailySummary: s.daily_summary ?? true,
    theme: s.theme ?? null,
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
    try {
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
        await db.settings.put({ key: NOTIFICATION_SETTINGS_KEY, value: rowToSettings(s) });
      }
      return true;
    } catch (err) {
      // A network failure (notably an offline background pull) rejects here;
      // return false so callers can carry on with local data instead of an
      // unhandled rejection.
      console.warn('Pull from Supabase threw.', err);
      return false;
    }
  });
}

// --- Realtime (instant cross-device updates) -------------------------------
// Subscribe to the user's rows via Supabase Realtime so a change on one device
// lands on the others within a moment, instead of waiting for the next pull.
// Applies each change straight into Dexie, then calls onChange(table) so the UI
// store can reload. Returns an unsubscribe function. Requires the tables to be
// in the `supabase_realtime` publication (see the migration note).
export type SyncTable = 'areas' | 'habits' | 'logs' | 'notification_settings';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

export function subscribeUserRealtime(
  userId: string,
  onChange: (table: SyncTable) => void,
): () => void {
  const client = supabase;
  if (!client) return () => {};

  const filter = `user_id=eq.${userId}`;
  const channel = client.channel(`harmony:${userId}`);

  const apply = async (table: SyncTable, p: RealtimePayload) => {
    if (table === 'notification_settings') {
      if (p.eventType !== 'DELETE') {
        await db.settings.put({ key: NOTIFICATION_SETTINGS_KEY, value: rowToSettings(p.new as unknown as SettingsRow) });
      }
    } else if (p.eventType === 'DELETE') {
      const id = p.old.id as string | undefined;
      if (id) await db[table].delete(id);
    } else if (table === 'areas') {
      await db.areas.put(rowToArea(p.new as unknown as AreaRow));
    } else if (table === 'habits') {
      await db.habits.put(rowToHabit(p.new as unknown as HabitRow));
    } else {
      await db.logs.put(rowToLog(p.new as unknown as LogRow));
    }
    onChange(table);
  };

  const tables: SyncTable[] = ['areas', 'habits', 'logs', 'notification_settings'];
  for (const table of tables) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter },
      (payload) => void apply(table, payload as unknown as RealtimePayload),
    );
  }
  channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

// Data-only delete: removes everything the signed-in user can reach under row
// level security. The auth.users row can't be removed from the browser (that
// needs the service role), so this alone leaves the account registered.
async function deleteUserDataViaRls(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('logs').delete().eq('user_id', userId);
  await supabase.from('nudge_history').delete().eq('user_id', userId);
  await supabase.from('habits').delete().eq('user_id', userId);
  await supabase.from('areas').delete().eq('user_id', userId);
  await supabase.from('notification_settings').delete().eq('user_id', userId);
  await supabase.from('profiles').delete().eq('id', userId);
}

// Full account deletion. Prefer the worker, which deletes the data AND the
// auth.users row with the service role, so the email is freed for re-signup.
// Falls back to a data-only delete if the worker isn't configured or fails.
// Returns whether the auth account itself was removed.
export async function deleteAccount(userId: string): Promise<{ accountRemoved: boolean }> {
  const workerUrl = import.meta.env.VITE_PUSH_WORKER_URL as string | undefined;
  let accountRemoved = false;

  if (workerUrl && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        const res = await fetch(`${workerUrl.replace(/\/$/, '')}/delete-account`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        });
        if (res.ok) accountRemoved = true;
        else console.warn('Worker delete-account failed', res.status, await res.text());
      }
    } catch (err) {
      console.warn('Worker delete-account error', err);
    }
  }

  // The worker already removed the data on success; otherwise clear what we can.
  if (!accountRemoved) await deleteUserDataViaRls(userId);
  await db.delete();
  return { accountRemoved };
}

// Clears all local (Dexie) data without touching the cloud. Used on sign-out so
// the next account on this device starts clean and nothing is left at rest. A
// returning user re-hydrates from the cloud on sign-in. Uses clear() rather than
// delete() so the database stays open for the next session.
export async function wipeLocalData(): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()));
}
