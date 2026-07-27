-- Egress: let Postgres answer "does anyone need a push this minute?" in one
-- small request, instead of the worker downloading everyone's data to work it
-- out itself.
--
-- The push worker's cron runs every minute so a habit reminder fires at the
-- minute the user set. Until now each of those 1,440 daily passes pulled the
-- profile list, the subscription list, and then a per-user bundle (habits,
-- today's logs, recent nudges, settings, subscriptions) — five to seven
-- PostgREST responses a minute, all day, to discover that almost every minute
-- nothing is due. That idle polling was the bulk of the remaining PostgREST
-- egress.
--
-- due_push_users() moves that decision into the database. It returns only the
-- users who have a reminder or the evening round-up genuinely due right now,
-- so on a normal minute the worker's entire Supabase traffic is one response
-- with an empty array in it.
--
-- The predicates below deliberately mirror the worker's own checks in
-- index.ts / schedule.ts. It is a pre-filter, not the authority: the worker
-- still re-checks everything (including habit cadence, which stays in TS
-- because it reads the cadence JSON). Keep it conservative — over-returning a
-- user only costs one bundle fetch, under-returning drops a notification. If
-- you change REMINDER_CATCHUP_MIN, SUMMARY_TIME, or the template ids in the
-- worker, they are passed in as arguments here, so nothing needs editing.

-- "HH:mm" (as the app stores reminder_time and dnd_*) to minutes-of-day.
-- Returns null on anything malformed, so a bad value simply never matches
-- rather than raising and taking the whole pass down.
create or replace function hhmm_to_minutes(t text)
returns int
language sql
immutable
as $$
  select case
    when t ~ '^[0-9]{1,2}:[0-9]{2}$'
      then split_part(t, ':', 1)::int * 60 + split_part(t, ':', 2)::int
  end
$$;

create or replace function due_push_users(
  reminder_catchup_min int,
  summary_time text,
  summary_catchup_min int,
  reminder_template_id text,
  summary_template_id text
)
returns table (id uuid, first_name text, timezone text)
language sql
stable
as $$
  -- Materialised once per call: `at time zone` raises on an unknown zone, which
  -- would fail the whole pass for every user. Falling back to UTC for an
  -- unrecognised value matches what the worker's localHHmm() already does.
  with zones as materialized (
    select name from pg_timezone_names
  ),
  candidates as (
    select
      p.id,
      p.first_name,
      p.timezone,
      -- The zone actually used for date maths below. p.timezone is still
      -- returned as-is: the worker does its own local-time formatting from it.
      coalesce(z.name, 'UTC') as tz,
      coalesce(s.habit_reminders, true) as habit_reminders,
      coalesce(s.daily_summary, true) as daily_summary,
      now() at time zone coalesce(z.name, 'UTC') as local_now
    from profiles p
    left join notification_settings s on s.user_id = p.id
    left join zones z on z.name = p.timezone
    where p.onboarded_at is not null
      -- No settings row means the worker's defaults, which have it enabled.
      and coalesce(s.master_enabled, true)
      -- Only a subscribed device can receive anything.
      and exists (select 1 from push_subscriptions ps where ps.user_id = p.id)
  ),
  users as (
    select
      c.*,
      c.local_now::date as local_date,
      (extract(hour from c.local_now) * 60 + extract(minute from c.local_now))::int as now_min
    from candidates c
  )
  select u.id, u.first_name, u.timezone
  from users u
  where
    -- A per-habit reminder whose time has arrived (or is inside the catch-up
    -- window), on a habit that is still unlogged today and hasn't already been
    -- reminded today. Cadence is not checked here; the worker does that.
    (
      u.habit_reminders
      and exists (
        select 1
        from habits h
        where h.user_id = u.id
          and h.archived_at is null
          and h.reminder_time is not null
          and u.now_min - hhmm_to_minutes(h.reminder_time)
                between 0 and reminder_catchup_min - 1
          and not exists (
            select 1 from logs l
            where l.habit_id = h.id
              and l.date = u.local_date
              and l.deleted_at is null
          )
          and not exists (
            select 1 from nudge_history n
            where n.user_id = u.id
              and n.habit_id = h.id
              and n.template_id = reminder_template_id
              -- Bounded so the (user_id, sent_at) index does the work; two days
              -- covers "today" in any timezone.
              and n.sent_at > now() - interval '2 days'
              and (n.sent_at at time zone u.tz)::date = u.local_date
          )
      )
    )
    or
    -- The evening round-up, once per local day.
    (
      u.daily_summary
      and u.now_min - hhmm_to_minutes(summary_time)
            between 0 and summary_catchup_min - 1
      and not exists (
        select 1 from nudge_history n
        where n.user_id = u.id
          and n.template_id = summary_template_id
          and n.sent_at > now() - interval '2 days'
          and (n.sent_at at time zone u.tz)::date = u.local_date
      )
    )
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC by default, which would
-- expose it through PostgREST to anon and authenticated callers. Only the
-- worker's service role has any business calling it.
revoke execute on function hhmm_to_minutes(text) from public;
revoke execute on function due_push_users(int, text, int, text, text) from public;
grant execute on function hhmm_to_minutes(text) to service_role;
grant execute on function due_push_users(int, text, int, text, text) to service_role;

-- Supports the per-habit "already reminded today" check above; the existing
-- indexes are on (user_id, sent_at) and (user_id, area_id, sent_at).
create index if not exists nudge_history_user_habit_sent_idx
  on nudge_history (user_id, habit_id, sent_at);
