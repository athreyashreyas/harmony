-- Mirrors the Dexie "nudgeHistory" table (section 6.1). The push worker reads
-- this directly when running cron drift checks (section 6.2), so in-app nudges
-- recorded on device need to land here too, to keep the worker from repeating
-- what the app has already said. Same row level security pattern as the rest.

create table nudge_history (
  id uuid primary key,
  user_id uuid references auth.users not null,
  template_id text not null,
  area_id uuid references areas on delete cascade,
  habit_id uuid references habits on delete cascade,
  composed_text text not null,
  sent_at timestamptz not null,
  channel text not null check (channel in ('push', 'in-app'))
);

create index on nudge_history(user_id, sent_at);
create index on nudge_history(user_id, area_id, sent_at);

alter table nudge_history enable row level security;

create policy "Users manage their own nudge history"
  on nudge_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
