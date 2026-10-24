"""Supabase clients.

- `anon_client()` for public reads (RLS applies as the anon role).
- `user_client(jwt)` carries the caller's token so RLS applies as that user.
- `service_client()` bypasses RLS. Use it only after authorizing the caller in code,
  for writes the spec routes through FastAPI (Tolken ledger, team members, research runs, source).
"""

from functools import lru_cache

from supabase import Client, ClientOptions, create_client

from .config import settings


@lru_cache
def service_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_key)


@lru_cache
def anon_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def user_client(jwt: str) -> Client:
    return create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
        options=ClientOptions(headers={"Authorization": f"Bearer {jwt}"}),
    )
