-- Who finished a need and when, so completed tasks (with or without a Tolken bounty) count as
-- contributions. submitted_by is set when a team member submits work; completed_by and
-- completed_at are set when the owner confirms it.
alter table project_needs
  add column if not exists submitted_by uuid references profiles(id) on delete set null,
  add column if not exists completed_by uuid references profiles(id) on delete set null,
  add column if not exists completed_at timestamptz;

create index if not exists project_needs_completed_idx on project_needs (completed_by, completed_at);

-- Backfill: before this migration a submission was only a "Submitted work for <skill>" comment.
-- Recover the latest submitter per need from those comments; filled needs credit them as done.
with latest as (
  select distinct on (n.id) n.id as need_id, n.status, c.author_id, c.created_at
  from project_needs n
  join skills s on s.id = n.skill_id
  join comments c on c.project_id = n.project_id and c.body like 'Submitted work for ' || s.name || '%'
  where n.submitted_by is null
  order by n.id, c.created_at desc
)
update project_needs n
set submitted_by = l.author_id,
    completed_by = case when l.status = 'filled' then l.author_id end,
    completed_at = case when l.status = 'filled' then l.created_at end
from latest l
where n.id = l.need_id;
