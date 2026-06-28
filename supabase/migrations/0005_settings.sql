-- Phase 9 (section 14): per-area drift sensitivity and reminder time-of-day,
-- plus one notification_settings row per user. Same row level security
-- pattern as the rest.

alter table areas
  add column drift_sensitivity text not null default 'default'
    check (drift_sensitivity in ('low', 'default', 'high')),
  add column reminder_time_of_day text not null default 'anytime'
    check (reminder_time_of_day in ('morning', 'afternoon', 'evening', 'anytime'));

create table notification_settings (
  user_id uuid primary key references auth.users on delete cascade,
  master_enabled boolean not null default true,
  muted_area_ids uuid[] not null default '{}',
  dnd_start text not null default '21:00',
  dnd_end text not null default '07:00'
);

alter table notification_settings enable row level security;

create policy "Users manage their own notification settings"
  on notification_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
