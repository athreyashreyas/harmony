-- Stores a person's rituals (named, ordered flows of habits to move through
-- together) on the synced settings row, so they follow across devices. Small
-- per-account data: an array of { id, name, habitIds }. Defaults to an empty
-- list so rows written before this column read back fine.

alter table notification_settings
  add column if not exists rituals jsonb not null default '[]'::jsonb;
