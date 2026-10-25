-- Who finished a need and when, so completed tasks (with or without a Tolken bounty) count as
-- contributions. submitted_by is set when a team member submits work; completed_by and
-- completed_at are set when the owner confirms it.
alter table project_needs
  add column if not exists submitted_by uuid references profiles(id) on delete set null,
  add column if not exists completed_by uuid references profiles(id) on delete set null,
  add column if not exists completed_at timestamptz;

create index if not exists project_needs_completed_idx on project_needs (completed_by, completed_at);
