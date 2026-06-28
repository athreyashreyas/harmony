-- Mirrors the Dexie "areas" and "habits" tables (section 6.1). Same row level
-- security pattern as profiles: each user only sees their own rows. The "order"
-- column is named sort_order to avoid the reserved word. Dexie stays the source
-- of truth on device; these tables reconcile in the background.

create table areas (
  id uuid primary key,
  user_id uuid references auth.users not null,
  name text not null,
  color text not null,
  importance text not null check (importance in ('core', 'matters', 'optional')),
  why_sentence text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index on areas(user_id);

alter table areas enable row level security;

create policy "Users manage their own areas"
  on areas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table habits (
  id uuid primary key,
  user_id uuid references auth.users not null,
  area_id uuid references areas on delete cascade not null,
  name text not null,
  cadence jsonb not null,
  time_of_day text not null check (time_of_day in ('morning', 'afternoon', 'evening', 'anytime')),
  reminder_time text,
  start_date date not null,
  end_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index on habits(user_id);
create index on habits(area_id);

alter table habits enable row level security;

create policy "Users manage their own habits"
  on habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
