import type { Area, Habit, Log, UserProfile } from '@harmony/shared';
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
