-- Server-side safety bounds on user-entered text, set well above the app's UX
-- limits (habit name 60, area name 30, why 240, note 1000). RLS already means a
-- tampered client could only ever write into its own rows, but these caps stop
-- absurdly large values at the source too. Idempotent so re-running is harmless.

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'areas_name_len') then
    alter table areas add constraint areas_name_len check (char_length(name) <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'areas_why_len') then
    alter table areas add constraint areas_why_len check (char_length(why_sentence) <= 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'habits_name_len') then
    alter table habits add constraint habits_name_len check (char_length(name) <= 200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'logs_note_len') then
    alter table logs add constraint logs_note_len check (note is null or char_length(note) <= 2000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_first_name_len') then
    alter table profiles add constraint profiles_first_name_len check (char_length(first_name) <= 100);
  end if;
end $$;
