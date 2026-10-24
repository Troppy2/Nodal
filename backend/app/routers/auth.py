"""Name-only sign-in. There are no passwords or emails in Nodal: the name finds an existing profile
(handle first, then display name, case-insensitive) or creates a new one. The server then mints a real
Supabase session for that user through an admin magic link that is verified immediately, never emailed.

Demo trade-off: anyone who types a name signs in as that person.
"""

import re
import uuid

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ..config import settings
from ..db import service_client
from ..limits import limiter

router = APIRouter()

# Accounts need an email internally; these addresses are never shown or sent to.
EMAIL_DOMAIN = "users.nodal.local"


class NameIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class SessionOut(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user_id: str
    created: bool


def _slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:24]
    return s if len(s) >= 2 else f"user-{s}".strip("-")


def _find_profile(name: str) -> dict | None:
    sb = service_client()
    by_handle = sb.table("profiles").select("id,handle").eq("handle", _slug(name)).limit(1).execute().data
    if by_handle:
        return by_handle[0]
    # Escape LIKE wildcards so "%" or "_" can't match someone else's name.
    literal = name.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")
    by_name = sb.table("profiles").select("id,handle").ilike("display_name", literal).order("created_at").limit(1).execute().data
    return by_name[0] if by_name else None


def _unique_handle(base: str) -> str:
    sb = service_client()
    handle = base
    for n in range(2, 50):
        if not sb.table("profiles").select("id").eq("handle", handle).execute().data:
            return handle
        handle = f"{base}-{n}"
    return f"{base}-{uuid.uuid4().hex[:6]}"


def _create_user(name: str) -> str:
    sb = service_client()
    handle = _unique_handle(_slug(name))
    res = sb.auth.admin.create_user({
        "email": f"{handle}-{uuid.uuid4().hex[:6]}@{EMAIL_DOMAIN}",
        "email_confirm": True,
        "user_metadata": {"name": name},
    })
    user_id = res.user.id
    # The signup trigger made a placeholder handle; replace it with one derived from the name.
    sb.table("profiles").update({"handle": handle, "display_name": name}).eq("id", user_id).execute()
    return user_id


def _session_for(user_id: str) -> dict:
    sb = service_client()
    user = sb.auth.admin.get_user_by_id(user_id).user
    link = sb.auth.admin.generate_link({"type": "magiclink", "email": user.email})
    r = httpx.post(
        f"{settings.supabase_url}/auth/v1/verify",
        headers={"apikey": settings.supabase_anon_key},
        json={"type": "magiclink", "token_hash": link.properties.hashed_token},
        timeout=10,
    )
    if r.status_code != 200:
        raise HTTPException(502, "Could not start a session. Try again.")
    return r.json()


@router.post("/auth/name", response_model=SessionOut)
@limiter.limit("20/minute")
def sign_in_with_name(request: Request, body: NameIn):
    if not settings.name_signin_enabled:
        raise HTTPException(404, "Not found")
    name = " ".join(body.name.split())
    if not name:
        raise HTTPException(422, "Enter your name")
    found = _find_profile(name)
    user_id = found["id"] if found else _create_user(name)
    s = _session_for(user_id)
    return {"access_token": s["access_token"], "refresh_token": s["refresh_token"], "expires_in": s["expires_in"],
            "user_id": user_id, "created": found is None}
