"""Startup check of the Supabase settings, so a mispasted key fails loudly with its name instead of
surfacing later as "The database rejected that request".

Legacy Supabase keys are JWTs whose payload names the project (`ref`) and the role. Reading the payload
needs no secret, so this checks that each key is a JWT for this project with the role its setting
expects. It never logs key values."""

import base64
import json
import logging
from urllib.parse import urlparse

from .config import settings

log = logging.getLogger("nodal")
EXPECTED = {"SUPABASE_ANON_KEY": "anon", "SUPABASE_SERVICE_KEY": "service_role"}


def _claims(key: str) -> dict | None:
    parts = key.split(".")
    if len(parts) != 3:
        return None
    try:
        payload = parts[1] + "=" * (-len(parts[1]) % 4)
        return json.loads(base64.urlsafe_b64decode(payload))
    except ValueError:
        return None


def problems() -> list[str]:
    """Human-readable problems with the Supabase settings, empty when they look right."""
    out = []
    host = urlparse(settings.supabase_url).hostname or ""
    ref = host.split(".")[0] if host.endswith(".supabase.co") else None
    if not settings.supabase_url:
        out.append("SUPABASE_URL is empty")
    for name, role in EXPECTED.items():
        key = getattr(settings, name.lower())
        if not key:
            out.append(f"{name} is empty")
            continue
        if key != key.strip() or key[0] in "'\"":
            out.append(f"{name} has spaces or quotes around it; remove them")
            continue
        if key.startswith(("sb_publishable_", "sb_secret_")):
            out.append(f"{name} is a new-style {key.split('_')[1]} key; use the legacy JWT key (starts with eyJ) "
                       "from Project Settings > API Keys > Legacy API keys")
            continue
        claims = _claims(key)
        if claims is None:
            out.append(f"{name} is not a complete key (it should be three dot-separated parts starting with eyJ); "
                       "it may be cut off")
            continue
        if claims.get("role") != role:
            out.append(f"{name} is the {claims.get('role')!r} key, but it should be the {role!r} key")
        if ref and claims.get("ref") != ref:
            out.append(f"{name} belongs to project {claims.get('ref')!r}, not {ref!r} from SUPABASE_URL")
    return out


def check() -> None:
    for p in problems():
        log.error("Supabase config: %s", p)
