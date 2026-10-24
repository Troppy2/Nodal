"""Slug and handle URLs. The frontend links to /projects/plant-monitor and /profiles/maya/follow;
routers work in UUIDs. This middleware rewrites a slug (or handle) path segment to its UUID before
routing, so every project route accepts either. Lookups come from the world, so they cost no query.
Unknown slugs pass through and 404 as usual."""

import re
import uuid

from anyio import to_thread
from starlette.types import ASGIApp, Receive, Scope, Send

from .db import service_client
from .world import world

PROJECT_PATH = re.compile(r"^(/api/v1/(?:graph/)?projects/)([^/]+)(.*)$")
FOLLOW_PATH = re.compile(r"^(/api/v1/profiles/)([^/]+)(/follow)$")
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{0,80}$")
MAX_SLUG_LEN = 60


def is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def slugify(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:MAX_SLUG_LEN] or "project"


def unique_slug(title: str) -> str:
    """Checked live, not against the world: two projects must never share a slug."""
    base = slugify(title)
    taken = {r["slug"] for r in service_client().table("projects").select("slug").like("slug", f"{base}%").execute().data}
    n, slug = 2, base
    while slug in taken:
        slug, n = f"{base}-{n}", n + 1
    return slug


def _resolve(path: str) -> str:
    for pattern, index in ((PROJECT_PATH, "by_slug"), (FOLLOW_PATH, "by_handle")):
        m = pattern.match(path)
        if m:
            ref = m.group(2)
            if not is_uuid(ref) and SLUG.match(ref):
                found = getattr(world(), index).get(ref)
                if found:
                    return f"{m.group(1)}{found}{m.group(3)}"
            return path
    return path


class SlugMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and (PROJECT_PATH.match(scope["path"]) or FOLLOW_PATH.match(scope["path"])):
            path = await to_thread.run_sync(_resolve, scope["path"])     # a world load blocks, so not on the loop
            if path != scope["path"]:
                scope = {**scope, "path": path, "raw_path": path.encode()}
        await self.app(scope, receive, send)
