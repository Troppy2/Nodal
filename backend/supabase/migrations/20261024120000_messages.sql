-- Direct messages. An invite to a project and the follow-up ("have you seen it?")
-- are messages of kind invite and nudge, so the whole conversation lives in one thread.
create table messages (
  id uuid primary key default gen_random_uuid(),
  from_profile_id uuid not null references profiles(id) on delete cascade,
  to_profile_id uuid not null references profiles(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  kind text not null default 'text' check (kind in ('text', 'invite', 'nudge')),
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (from_profile_id <> to_profile_id)
);
create index messages_from_idx on messages (from_profile_id, created_at desc);
create index messages_to_idx on messages (to_profile_id, created_at desc);

alter table messages enable row level security;

create policy messages_read on messages for select
  using (from_profile_id = auth.uid() or to_profile_id = auth.uid());
create policy messages_insert on messages for insert
  with check (from_profile_id = auth.uid());
