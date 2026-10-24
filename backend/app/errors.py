"""Turns Supabase failures into clear API errors instead of bare 500s.

PostgREST reports Postgres error codes; the common ones map to the status a client can act on.
Network trouble reaching Supabase is a 503 so the frontend can say "try again"."""

import logging

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

from . import keycheck

log = logging.getLogger("nodal")

PG_STATUS = {
    "23505": (409, "That already exists"),             # unique_violation
    "23503": (409, "That refers to something that no longer exists"),   # foreign_key_violation
    "23514": (422, "That value isn't allowed"),        # check_violation
    "23502": (422, "A required field is missing"),     # not_null_violation
    "22P02": (422, "Badly formed id or value"),        # invalid_text_representation (e.g. bad uuid)
    "42501": (403, "You can't change that"),           # insufficient_privilege (RLS or grants)
    "PGRST116": (404, "Not found"),                    # .single() with no row
}


def install(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def postgrest_error(request: Request, exc: APIError):
        if str(exc.code) == "401":
            # Supabase's gateway refused the API key itself (not a user's token): a server config problem
            found = keycheck.problems()
            log.error("Supabase rejected the server's API key on %s %s. %s", request.method, request.url.path,
                      "; ".join(found) if found else
                      "SUPABASE_ANON_KEY and SUPABASE_SERVICE_KEY look well formed, so one is probably from another "
                      "project or was rotated: copy both again from Project Settings > API Keys > Legacy API keys")
            return JSONResponse({"detail": "The server's database key was rejected. Check the backend log."},
                                status_code=503)
        status, detail = PG_STATUS.get(str(exc.code), (502, "The database rejected that request"))
        if status == 502:
            log.error("PostgREST error on %s %s: %s %s", request.method, request.url.path, exc.code, exc.message)
        return JSONResponse({"detail": detail}, status_code=status)

    @app.exception_handler(httpx.TransportError)
    async def supabase_unreachable(request: Request, exc: httpx.TransportError):
        log.error("Supabase unreachable on %s %s: %r", request.method, request.url.path, exc)
        return JSONResponse({"detail": "Can't reach the database right now. Try again."}, status_code=503)
