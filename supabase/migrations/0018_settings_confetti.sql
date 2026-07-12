-- Whether the confetti celebration plays when a Bloom section reaches full
-- bloom. Carried on the synced settings row so the choice follows the person
-- across devices. Defaults to true so rows written before this column, and
-- people who never touch the setting, keep the celebration on.

alter table notification_settings
  add column if not exists confetti_enabled boolean not null default true;
