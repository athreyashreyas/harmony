-- Optional D1 cache (section 17.4). A local record of sent nudges to avoid
-- hammering Supabase on every cron pass. The source of truth stays in
-- Supabase's nudge_history table; this is only a cache. The worker runs
-- correctly without D1 at all, reading nudge_history from Supabase instead.

create table sent_nudges (
  id text primary key,            -- nudge history id, matches the Supabase row
  user_id text not null,
  area_id text,
  template_id text not null,
  sent_at integer not null,
  unique(user_id, area_id, sent_at)
);

create index idx_sent_nudges_user on sent_nudges(user_id, sent_at);
