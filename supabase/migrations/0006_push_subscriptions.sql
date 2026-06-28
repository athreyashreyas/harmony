-- Push subscriptions (section 6.3). One row per installed device. The worker
-- (Phase 11) writes these with the service role; the RLS policy below also lets
-- the app write its own subscription directly when no worker URL is configured.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

create index on push_subscriptions(user_id);
create unique index on push_subscriptions(endpoint);

alter table push_subscriptions enable row level security;

create policy "Users manage their own push subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
