-- Incremental log sync. A per-row updated_at (bumped on every write by a
-- trigger) and a soft-delete flag (deleted_at) let a device pull exactly the
-- logs that changed since it last synced — inserts, edits, and deletions alike,
-- of any date — instead of re-downloading history or missing an old-date change
-- it was offline for. This is what makes cross-device catch-up on reconnect both
-- immediate and cheap. A pruner (in the worker) hard-deletes tombstones after a
-- safe window, so soft-deleted rows never accumulate.

alter table logs add column if not exists updated_at timestamptz not null default now();
alter table logs add column if not exists deleted_at timestamptz;

create index if not exists logs_user_updated_idx on logs(user_id, updated_at);

create or replace function harmony_set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists logs_set_updated_at on logs;
create trigger logs_set_updated_at
  before insert or update on logs
  for each row execute function harmony_set_updated_at();
