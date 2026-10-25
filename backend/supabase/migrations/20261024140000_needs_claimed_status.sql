-- Allow 'claimed' status on project_needs for tasks submitted for review
alter table project_needs drop constraint if exists project_needs_status_check;
alter table project_needs add constraint project_needs_status_check check (status in ('open', 'claimed', 'filled'));
