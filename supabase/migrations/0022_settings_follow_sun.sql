-- Whether the theme follows the sun: the day half of the chosen pair between
-- sunrise and sunset, the after-dark half the rest of the time. Carried on the
-- synced settings row so the choice follows the person across devices, the way
-- the theme itself does. Defaults to false: an app that changes colour on its
-- own is a surprise, so it stays off until someone asks for it.
--
-- Only the preference syncs. The coordinates used to work out sunrise are kept
-- on the device and never sent.

alter table notification_settings
  add column if not exists follow_sun boolean not null default false;
