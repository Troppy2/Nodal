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
from ..db import parallel, service_client
from ..handles import handle_base, unique_handle
from ..limits import limiter

router = APIRouter()

# Accounts need an email internally; these addresses are never shown or sent to.
EMAIL_DOMAIN = "users.nodal.local"
# PostgREST treats * % _ \ and its own , ( ) specially inside ilike, so such names never match a person.
PATTERN_CHARS = re.compile(r"[*%_\\,()]")


class NameIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class SessionOut(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user_id: str
    created: bool


def _find_profile(name: str) -> dict | None:
    """By handle, else the oldest profile whose display name equals the name (any case). Both in parallel."""
    sb = service_client()

    def by_handle():
        return sb.table("profiles").select("id").eq("handle", handle_base(name)).limit(1).execute().data

    def by_name():
        if PATTERN_CHARS.search(name):
            return []
        return sb.table("profiles").select("id").ilike("display_name", name).order("created_at").limit(1).execute().data

    handle_hit, name_hit = parallel(by_handle, by_name)
    hit = handle_hit or name_hit
    return hit[0] if hit else None


def _create_user(name: str) -> str:
    sb = service_client()
    handle = unique_handle(name)
    user_id = sb.auth.admin.create_user({
        "email": f"{handle}-{uuid.uuid4().hex[:6]}@{EMAIL_DOMAIN}",
        "email_confirm": True,
        "user_metadata": {"name": name},
    }).user.id
    # the signup trigger made the profile with a placeholder handle; name it now
    sb.table("profiles").update({"handle": handle, "display_name": name}).eq("id", user_id).execute()
    return user_id


def _session_for(user_id: str) -> dict:
    """A real session for an existing user, without a password: generate a magic link and verify it here."""
    sb = service_client()
    email = sb.auth.admin.get_user_by_id(user_id).user.email
    link = sb.auth.admin.generate_link({"type": "magiclink", "email": email})
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
