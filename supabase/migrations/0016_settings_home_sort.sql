-- Stores how the Home habit list is ordered (a SortKey id: 'time', 'priority',
-- or 'todo'), on the synced settings row, so the chosen order follows the person
-- across their devices. Null means the default (time of day).

alter table notification_settings
  add column if not exists home_sort text;
