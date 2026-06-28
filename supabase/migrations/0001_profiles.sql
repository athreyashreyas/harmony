-- Mirrors the Dexie "profile" table (section 6.1) for the one entity Phase 2
-- needs in Supabase. Areas, habits, logs, and nudge history get their own
-- mirrored tables, with the same row level security pattern, in a later
-- phase. Row level security ensures each user only ever sees their own row.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  first_name text not null,
  onboarded_at timestamptz,
  timezone text not null,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);
