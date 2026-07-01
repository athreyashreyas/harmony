-- Tracks the app version whose "What's new" the person has already seen, on the
-- synced settings row, so a release is shown once per account (not once per
-- device, and not repeatedly). Null means they have not seen any yet.

alter table notification_settings
  add column if not exists last_seen_version text;
