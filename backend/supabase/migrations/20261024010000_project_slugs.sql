-- Readable project URLs (/projects/plant-monitor). The API accepts a slug anywhere it takes a project id.
alter table projects add column if not exists slug text;
update projects set slug = trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'))
                           || '-' || substr(id::text, 1, 4)
  where slug is null;
alter table projects alter column slug set not null;
create unique index if not exists projects_slug_key on projects (slug);
