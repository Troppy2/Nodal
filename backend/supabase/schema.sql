-- Nodal schema. Run in the Supabase SQL editor.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  earned_cents int not null default 0,
  interests text[] not null default '{}',
  created_at timestamptz default now()
);

create table skills (
  id serial primary key,
  name text not null,
  slug text unique not null,
  category text not null check (category in ('software','hardware','creative'))
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('software','hardware','creative')),
  title text not null,
  summary text not null,
  readme_md text,
  stage text not null default 'building' check (stage in ('idea','building','shipped')),
  cover_url text,
  repo_url text,
  demo_url text,
  source_access text not null default 'none' check (source_access in ('none','open','closed')),
  price_cents int,
  source_zip_path text,
  source_size_bytes bigint,
  source_uploaded_at timestamptz,
  created_at timestamptz default now(),
  check (source_access <> 'closed' or price_cents >= 100)
);

create table project_needs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  skill_id int not null references skills(id),
  note text,
  bounty_cents int check (bounty_cents is null or bounty_cents >= 100),
  status text not null default 'open' check (status in ('open','filled'))
);
create index on project_needs (skill_id, status);

create table profile_offers (
  profile_id uuid not null references profiles(id) on delete cascade,
  skill_id int not null references skills(id),
  level int not null check (level between 1 and 3),
  available boolean default true,
  primary key (profile_id, skill_id)
);
create index on profile_offers (skill_id);

create table project_tags (
  project_id uuid not null references projects(id) on delete cascade,
  tag text not null,
  primary key (project_id, tag)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create table collab_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  from_profile_id uuid not null references profiles(id) on delete cascade,
  skill_id int not null references skills(id),
  message text,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now()
);

create table unlocks (
  profile_id uuid not null references profiles(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  amount_cents int not null default 0,
  created_at timestamptz default now(),
  primary key (profile_id, project_id)
);

create table source_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  path text not null,
  size_bytes int not null,
  is_text boolean not null default false,
  unique (project_id, path)
);
create index on source_files (project_id);

-- file text lives in its own table with RLS on and NO policies
create table source_contents (
  file_id uuid primary key references source_files(id) on delete cascade,
  content text not null
);

create table research_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  requested_by uuid not null references profiles(id),
  status text not null default 'queued'
    check (status in ('queued','running','done','partial','failed')),
  checks text[] not null default '{market}',
  steps jsonb not null default '[]',
  report jsonb,
  cool jsonb,
  sources jsonb,
  model text,
  mode text not null default 'live',
  idea_hash text not null,
  is_public boolean not null default false,
  error text,
  created_at timestamptz default now(),
  finished_at timestamptz
);
create index on research_runs (project_id, created_at desc);

create table idea_suggestions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  pitch text not null,
  why_you text not null,
  skill_ids int[] not null default '{}',
  tags text[] not null default '{}',
  dismissed boolean not null default false,
  posted_project_id uuid references projects(id) on delete set null,
  created_at timestamptz default now()
);

create table recommendation_dismissals (
  profile_id uuid not null references profiles(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  primary key (profile_id, project_id)
);

create table contributions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  need_id uuid not null references project_needs(id) on delete cascade,
  owner_id uuid not null references profiles(id),
  contributor_id uuid not null references profiles(id),
  amount_cents int not null check (amount_cents >= 100),
  status text not null default 'pending_funding'
    check (status in ('pending_funding','funded','released','refunded','cancelled')),
  mock_ref text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on contributions (owner_id);
create index on contributions (contributor_id);

-- social layer
create table project_stars (
  profile_id uuid not null references profiles(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (profile_id, project_id)
);

create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followee_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'contributor' check (role in ('owner','contributor')),
  skill_id int references skills(id),
  share_bps int check (share_bps between 0 and 10000),
  status text not null default 'invited' check (status in ('invited','joined')),
  created_at timestamptz default now(),
  primary key (project_id, profile_id)
);

create table cycle_invites (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references profiles(id),
  kind text not null check (kind in ('swap','ring')),
  links jsonb not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now()
);

create table cycle_invite_members (
  invite_id uuid not null references cycle_invites(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  response text not null default 'pending' check (response in ('pending','accepted','declined')),
  primary key (invite_id, profile_id)
);

create table sales (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  buyer_id uuid not null references profiles(id),
  amount_cents int not null,
  created_at timestamptz default now()
);

-- service-role only: credit a contributor or owner
create function increment_earned(p_profile uuid, p_cents int) returns void as $$
  update profiles set earned_cents = earned_cents + p_cents where id = p_profile;
$$ language sql security definer;
revoke execute on function increment_earned(uuid, int) from public, anon, authenticated;

-- trigger: create a profile row on signup
create function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, handle, display_name)
  values (new.id, split_part(new.email, '@', 1) || '-' || substr(new.id::text, 1, 4),
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ===== RLS =====
alter table profiles enable row level security;
alter table skills enable row level security;
alter table projects enable row level security;
alter table project_needs enable row level security;
alter table profile_offers enable row level security;
alter table project_tags enable row level security;
alter table comments enable row level security;
alter table collab_requests enable row level security;
alter table unlocks enable row level security;
alter table source_files enable row level security;
alter table source_contents enable row level security;   -- no policies on purpose
alter table research_runs enable row level security;
alter table idea_suggestions enable row level security;
alter table recommendation_dismissals enable row level security;
alter table contributions enable row level security;
alter table project_stars enable row level security;
alter table follows enable row level security;
alter table project_members enable row level security;
alter table cycle_invites enable row level security;
alter table cycle_invite_members enable row level security;
alter table sales enable row level security;

-- public read
create policy skills_read on skills for select using (true);
create policy projects_read on projects for select using (true);
create policy needs_read on project_needs for select using (true);
create policy tags_read on project_tags for select using (true);
create policy comments_read on comments for select using (true);
create policy profiles_read on profiles for select using (true);
create policy offers_read on profile_offers for select using (true);
create policy source_files_read on source_files for select using (true);
create policy stars_read on project_stars for select using (true);
create policy follows_read on follows for select using (true);
create policy members_read on project_members for select using (true);

-- projects and children: owner writes
create policy projects_insert on projects for insert with check (owner_id = auth.uid());
-- source_* columns are bookkeeping for the zip upload; only FastAPI (service role) sets them
revoke insert on projects from anon, authenticated;
grant insert (owner_id, type, title, summary, readme_md, stage, cover_url, repo_url, demo_url, source_access, price_cents)
  on projects to authenticated;
create policy projects_update on projects for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- clients may edit content columns only; owner_id and the source_* bookkeeping are written by FastAPI with the service role
revoke update on projects from anon, authenticated;
grant update (type, title, summary, readme_md, stage, cover_url, repo_url, demo_url, source_access, price_cents)
  on projects to authenticated;
create policy projects_delete on projects for delete using (owner_id = auth.uid());

create policy needs_insert on project_needs for insert
  with check (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy needs_update on project_needs for update
  using (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy needs_delete on project_needs for delete
  using (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy tags_insert on project_tags for insert
  with check (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy tags_update on project_tags for update
  using (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
create policy tags_delete on project_tags for delete
  using (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));

-- comments
create policy comments_insert on comments for insert with check (author_id = auth.uid());
create policy comments_delete on comments for delete using (author_id = auth.uid());

-- profiles and offers
create policy profiles_insert on profiles for insert with check (id = auth.uid());
create policy profiles_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- earned_cents is server-managed (increment_earned); clients can only edit these columns
revoke update on profiles from anon, authenticated;
grant update (handle, display_name, bio, avatar_url, interests) on profiles to authenticated;
create policy offers_insert on profile_offers for insert with check (profile_id = auth.uid());
create policy offers_update on profile_offers for update using (profile_id = auth.uid());
create policy offers_delete on profile_offers for delete using (profile_id = auth.uid());

-- collab requests
create policy collab_insert on collab_requests for insert
  with check (from_profile_id = auth.uid() and status = 'pending');
create policy collab_select on collab_requests for select using (
  from_profile_id = auth.uid()
  or exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
-- only the project owner responds (accept or decline); requesters cannot change status
create policy collab_update on collab_requests for update
  using (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));
revoke update on collab_requests from anon, authenticated;
grant update (status) on collab_requests to authenticated;

-- unlocks: read own, writes via FastAPI
create policy unlocks_read on unlocks for select using (profile_id = auth.uid());

-- research runs
create policy research_read on research_runs for select using (is_public or requested_by = auth.uid());

-- suggestions and dismissals
create policy suggestions_read on idea_suggestions for select using (profile_id = auth.uid());
create policy dismissals_read on recommendation_dismissals for select using (profile_id = auth.uid());

-- contributions
create policy contributions_read on contributions for select
  using (owner_id = auth.uid() or contributor_id = auth.uid());

-- stars and follows: actor writes own rows
create policy stars_insert on project_stars for insert with check (profile_id = auth.uid());
create policy stars_delete on project_stars for delete using (profile_id = auth.uid());
create policy follows_insert on follows for insert with check (follower_id = auth.uid());
create policy follows_delete on follows for delete using (follower_id = auth.uid());

-- cycle invites and sales: participants read, FastAPI writes
create policy invites_read on cycle_invites for select using (
  created_by = auth.uid()
  or exists (select 1 from cycle_invite_members m where m.invite_id = id and m.profile_id = auth.uid()));
create policy invite_members_read on cycle_invite_members for select using (
  profile_id = auth.uid()
  or exists (select 1 from cycle_invite_members m where m.invite_id = cycle_invite_members.invite_id and m.profile_id = auth.uid()));
create policy sales_read on sales for select using (
  buyer_id = auth.uid()
  or exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid())
  or exists (select 1 from project_members m where m.project_id = sales.project_id and m.profile_id = auth.uid()));
