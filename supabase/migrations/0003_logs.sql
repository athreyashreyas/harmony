-- Mirrors the Dexie "logs" table (section 6.1). Same row level security
-- pattern as areas and habits.

create table logs (
  id uuid primary key,
  user_id uuid references auth.users not null,
  habit_id uuid references habits on delete cascade not null,
  area_id uuid references areas on delete cascade not null,
  date date not null,
  logged_at timestamptz not null,
  note text
);

create index on logs(user_id);
create index on logs(habit_id, date);

alter table logs enable row level security;

create policy "Users manage their own logs"
  on logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
