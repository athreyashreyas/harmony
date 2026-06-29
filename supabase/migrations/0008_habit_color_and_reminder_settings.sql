-- Per-habit colour override (null = inherit the area's colour), and two new
-- notification preferences: per-habit scheduled reminders and the evening
-- round-up of unlogged habits. Table-level grants from 0007 already cover new
-- columns, so no new grants are needed.

alter table habits
  add column if not exists color text;

alter table notification_settings
  add column if not exists habit_reminders boolean not null default true,
  add column if not exists daily_summary boolean not null default true;
