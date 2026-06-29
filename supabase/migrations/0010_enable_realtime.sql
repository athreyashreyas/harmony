-- Enable Supabase Realtime for the user-data tables so a change on one device
-- is pushed to the user's other devices instantly (postgres_changes). RLS still
-- applies, so each client only receives its own rows. Idempotent: only adds a
-- table to the publication if it isn't already a member.

do $$
declare
  t text;
begin
  foreach t in array array['areas', 'habits', 'logs', 'notification_settings'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
