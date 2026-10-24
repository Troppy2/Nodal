-- Upstream added projects.slug as NOT NULL, but the column grants and the default were
-- never updated: API inserts hit "permission denied for table projects" and service-role
-- inserts (tests, seeds) hit "null value in column slug". Fill both gaps here.
create or replace function set_project_slug() returns trigger as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := trim(both '-' from regexp_replace(lower(new.title), '[^a-z0-9]+', '-', 'g'))
                || '-' || substr(new.id::text, 1, 4);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_set_slug on projects;
create trigger projects_set_slug before insert on projects
  for each row execute function set_project_slug();

grant insert (slug) on projects to authenticated;
grant update (slug) on projects to authenticated;
