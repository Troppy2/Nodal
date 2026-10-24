"""Handles derive from names: "Ada Lovelace" -> ada-lovelace, then ada-lovelace-2 if that is taken.
New accounts start with a placeholder (user-xxxxxxxx, from the signup trigger) until onboarding names them."""

import re

from .db import service_client

MAX_LEN = 24
PLACEHOLDER_PREFIX = "user-"


def handle_base(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:MAX_LEN]
    return s if len(s) >= 2 else f"{PLACEHOLDER_PREFIX}{s}".strip("-")


def unique_handle(name: str, exclude_id: str | None = None) -> str:
    """The base handle for this name, or the first free numbered one. One live query."""
    base = handle_base(name)
    q = service_client().table("profiles").select("handle").like("handle", f"{base}%")
    if exclude_id:
        q = q.neq("id", exclude_id)
    taken = {r["handle"] for r in q.execute().data}
    n, handle = 2, base
    while handle in taken:
        handle, n = f"{base}-{n}", n + 1
    return handle


def handle_taken(handle: str, exclude_id: str) -> bool:
    return bool(service_client().table("profiles").select("id").eq("handle", handle).neq("id", exclude_id).execute().data)
