-- Every table so far was created via raw SQL (the SQL editor), which does not
-- auto-grant table privileges to anon/authenticated the way Supabase's Table
-- Editor UI does. RLS policies only decide which ROWS a role may touch; the
-- role still needs a baseline GRANT to attempt the operation at all, or every
-- query fails with "permission denied for table X" before RLS is even
-- evaluated. This grants the authenticated role exactly what its RLS policies
-- already allow. service_role (used by the worker) bypasses RLS and grants
-- entirely, so it was never affected by this.

grant usage on schema public to authenticated;

grant select, insert, update, delete on profiles to authenticated;
grant select, insert, update, delete on areas to authenticated;
grant select, insert, update, delete on habits to authenticated;
grant select, insert, update, delete on logs to authenticated;
grant select, insert, update, delete on nudge_history to authenticated;
grant select, insert, update, delete on notification_settings to authenticated;
grant select, insert, update, delete on push_subscriptions to authenticated;

-- Migration 0001 defined select/insert/update policies for profiles but no
-- delete policy, which the delete-account flow (deleteAllUserData) needs.
create policy "Users can delete their own profile"
  on profiles for delete
  using (auth.uid() = id);
