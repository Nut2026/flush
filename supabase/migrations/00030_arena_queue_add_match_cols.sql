
alter table arena_queue 
  add column if not exists status text not null default 'waiting',
  add column if not exists match_id uuid,
  add column if not exists opponent_id uuid;

-- ensure realtime is on
alter publication supabase_realtime add table arena_queue;

-- RLS
alter table arena_queue enable row level security;
drop policy if exists "Users manage own queue" on arena_queue;
drop policy if exists "Users see queue" on arena_queue;
create policy "Users manage own queue" on arena_queue for all using (auth.uid() = user_id);
create policy "Users see queue" on arena_queue for select using (true);
