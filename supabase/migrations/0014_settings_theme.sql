-- Theme choice rides the existing per-user settings row so it syncs across a
-- person's devices the same way mute / quiet hours / reminder toggles do
-- (mirror + pull + realtime). Null means "use the default theme".

alter table notification_settings
  add column if not exists theme text;
