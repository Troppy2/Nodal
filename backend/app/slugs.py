"""Slug and handle URLs. The frontend links to /projects/plant-monitor and /profiles/maya/follow;
routers work in UUIDs. This middleware rewrites a slug (or handle) path segment to its UUID before
routing, so every project route accepts either. Unknown slugs pass through and 404 as usual."""

import re
import uuid

from starlette.types import ASGIApp, Receive, Scope, Send

from .db import service_client

PROJECT_PATH = re.compile(r"^(/api/v1/(?:graph/)?projects/)([^/]+)(.*)$")
FOLLOW_PATH = re.compile(r"^(/api/v1/profiles/)([^/]+)(/follow)$")
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{0,80}$")


def is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def slugify(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60] or "project"


def unique_slug(title: str) -> str:
    base = slugify(title)
    taken = {r["slug"] for r in service_client().table("projects").select("slug").like("slug", f"{base}%").execute().data}
    if base not in taken:
        return base
    n = 2
    while f"{base}-{n}" in taken:
        n += 1
    return f"{base}-{n}"


def _lookup(table: str, column: str, value: str) -> str | None:
    rows = service_client().table(table).select("id").eq(column, value).limit(1).execute().data
    return rows[0]["id"] if rows else None


class SlugMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            path = scope["path"]
            for pattern, table, column in ((PROJECT_PATH, "projects", "slug"), (FOLLOW_PATH, "profiles", "handle")):
                m = pattern.match(path)
                if m and not is_uuid(m.group(2)) and SLUG.match(m.group(2)):
                    found = _lookup(table, column, m.group(2))
                    if found:
                        path = f"{m.group(1)}{found}{m.group(3)}"
                        scope = {**scope, "path": path, "raw_path": path.encode()}
                    break
        await self.app(scope, receive, send)
