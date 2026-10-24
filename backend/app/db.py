"""Supabase access.

- `service_client()` bypasses RLS. Reads use it, and so do writes that FastAPI authorizes in code first
  (Tolken ledger, team members, research runs, source).
- `user_client(jwt)` runs PostgREST as the caller, so RLS applies as a second check. All user clients
  share one pooled HTTP connection: a fresh client per request cost ~300 ms of TLS setup on hosted Supabase.
- `parallel(...)` runs independent queries at once. Every query is a round trip (~100-150 ms hosted),
  so the number of sequential round trips is what sets an endpoint's latency.
- `select_all(query)` pages past PostgREST's 1000-row response cap.
"""

from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from typing import Any, Callable

import httpx
from postgrest import SyncPostgrestClient
from supabase import Client, ClientOptions, create_client

from .config import settings

PAGE_ROWS = 1000
_pool = ThreadPoolExecutor(max_workers=16, thread_name_prefix="supabase")


@lru_cache
def _http() -> httpx.Client:
    """One HTTP/1.1 pool for every Supabase call. (supabase-py's default HTTP/2 connection fails
    requests outright when the server rotates it, which parallel queries hit quickly.)"""
    return httpx.Client(timeout=20, follow_redirects=True,
                        limits=httpx.Limits(max_connections=32, max_keepalive_connections=16))


@lru_cache
def service_client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_key, options=ClientOptions(httpx_client=_http()))


def user_client(jwt: str) -> SyncPostgrestClient:
    return SyncPostgrestClient(
        f"{settings.supabase_url}/rest/v1",
        headers={"apikey": settings.supabase_anon_key, "Authorization": f"Bearer {jwt}"},
        http_client=_http(),
    )


def parallel(*calls: Callable[[], Any]) -> list[Any]:
    """Run each zero-argument callable on the pool and return their results in order."""
    futures = [_pool.submit(c) for c in calls]
    return [f.result() for f in futures]


def select_all(query) -> list[dict]:
    """Every row of a select, fetched in pages. `query` is an unexecuted builder; give it an order
    for stable paging."""
    rows: list[dict] = []
    start = 0
    while True:
        page = query.range(start, start + PAGE_ROWS - 1).execute().data
        rows += page
        if len(page) < PAGE_ROWS:
            return rows
        start += PAGE_ROWS
