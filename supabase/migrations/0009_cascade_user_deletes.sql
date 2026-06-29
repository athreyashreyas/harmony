-- Make deleting an auth user clean up all of their data automatically.
--
-- areas / habits / logs / nudge_history / push_subscriptions reference
-- auth.users(id) via user_id WITHOUT "on delete cascade", so deleting a user in
-- the dashboard failed with a foreign-key violation. (profiles and
-- notification_settings already cascade.) Re-create those constraints with
-- cascade. Constraint names are Postgres's defaults for inline references
-- (<table>_<column>_fkey); if yours differ, check
-- information_schema.table_constraints and adjust the names below.

alter table areas drop constraint if exists areas_user_id_fkey;
alter table areas
  add constraint areas_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table habits drop constraint if exists habits_user_id_fkey;
alter table habits
  add constraint habits_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table logs drop constraint if exists logs_user_id_fkey;
alter table logs
  add constraint logs_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table nudge_history drop constraint if exists nudge_history_user_id_fkey;
alter table nudge_history
  add constraint nudge_history_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table push_subscriptions drop constraint if exists push_subscriptions_user_id_fkey;
alter table push_subscriptions
  add constraint push_subscriptions_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;
