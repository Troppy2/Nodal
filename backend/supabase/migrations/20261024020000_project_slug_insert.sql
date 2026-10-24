-- The API sets a slug when a signed-in user creates a project, so authenticated needs insert on it.
-- (Slugs stay fixed after creation: no update grant.)
grant insert (slug) on projects to authenticated;
