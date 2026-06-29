-- The push worker connects with the service_role key to read every user's data
-- and write nudge history. Raw-SQL migrations don't auto-grant table privileges
-- the way the Table Editor does, and 0007 only granted them to `authenticated`,
-- so the worker's reads failed with "permission denied for table ..." and no
-- push ever fired. Grant service_role full access to the app tables (it bypasses
-- RLS by design), and set default privileges so future tables are covered too.

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
