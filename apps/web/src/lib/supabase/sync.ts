import type { Area, Habit, Log, NotificationSettings, NudgeHistory, UserProfile } from '@harmony/shared';
import { supabase } from './client';
import { db } from '../db/schema';

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
  };
}

// Best-effort mirror of the onboarding result to Supabase. Failures are
// swallowed: Dexie already holds the source of truth, and reconciliation
// happens in the background later.
export async function mirrorOnboarding(areas: Area[], habits: Habit[]): Promise<void> {
  if (!supabase) return;
  try {
    if (areas.length) {
      const { error } = await supabase.from('areas').upsert(areas.map(areaToRow));
      if (error) throw error;
    }
    if (habits.length) {
      const { error } = await supabase.from('habits').upsert(habits.map(habitToRow));
      if (error) throw error;
    }
  } catch (err) {
    console.warn('Onboarding mirror to Supabase failed, will reconcile later.', err);
  }
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
  if (!supabase) return;
  try {
    const { error } = await supabase.from('logs').upsert(logToRow(log));
    if (error) throw error;
  } catch (err) {
    console.warn('Log mirror to Supabase failed, will reconcile later.', err);
  }
}

export async function mirrorLogDelete(logId: string): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('logs').delete().eq('id', logId);
    if (error) throw error;
  } catch (err) {
    console.warn('Log delete mirror to Supabase failed, will reconcile later.', err);
  }
}

// Single row mirrors for the edit flows (Phase 5): area and habit create,
// edit, archive, and reorder all funnel through these.
export async function mirrorAreaUpsert(area: Area): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('areas').upsert(areaToRow(area));
    if (error) throw error;
  } catch (err) {
    console.warn('Area mirror to Supabase failed, will reconcile later.', err);
  }
}

export async function mirrorHabitUpsert(habit: Habit): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('habits').upsert(habitToRow(habit));
    if (error) throw error;
  } catch (err) {
    console.warn('Habit mirror to Supabase failed, will reconcile later.', err);
  }
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
  if (!supabase) return;
  try {
    const { error } = await supabase.from('nudge_history').upsert(nudgeToRow(nudge));
    if (error) throw error;
  } catch (err) {
    console.warn('Nudge mirror to Supabase failed, will reconcile later.', err);
  }
}

function notificationSettingsToRow(userId: string, s: NotificationSettings) {
  return {
    user_id: userId,
    master_enabled: s.masterEnabled,
    muted_area_ids: s.mutedAreaIds,
    dnd_start: s.dndStart,
    dnd_end: s.dndEnd,
  };
}

export async function mirrorNotificationSettings(userId: string, settings: NotificationSettings): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('notification_settings')
      .upsert(notificationSettingsToRow(userId, settings));
    if (error) throw error;
  } catch (err) {
    console.warn('Notification settings mirror to Supabase failed, will reconcile later.', err);
  }
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
