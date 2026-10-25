from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from . import errors, keycheck
from .config import settings
from .limits import limiter
from .routers import (
    auth, collab, comments, feed, graph, ideas, inbox, matches, me, messages, notifications, profiles, projects, recommendations,
    research, skills, social, source, team, tolken, upload,
)
from .slugs import SlugMiddleware
from .world import invalidate

READ_METHODS = {"GET", "HEAD", "OPTIONS"}


class InvalidateOnWrite:
    """After any request that may have written (POST, PUT, PATCH, DELETE), drop the cached world, so
    the next read sees the change. It runs as the response starts: the handler's writes are done, and
    the client can't send its next request before the cache is cleared."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] in READ_METHODS:
            return await self.app(scope, receive, send)

        async def send_after_invalidating(message: Message) -> None:
            if message["type"] == "http.response.start":
                invalidate()
            await send(message)

        await self.app(scope, receive, send_after_invalidating)


app = FastAPI(title="Nodal API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
errors.install(app)
keycheck.check()
app.add_middleware(InvalidateOnWrite)
app.add_middleware(SlugMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


for module in (
    auth, projects, skills, comments, collab, social, profiles, me, source,
    matches, graph, feed, recommendations, ideas, inbox, messages, team, tolken, research, notifications, upload,
):
    app.include_router(module.router, prefix="/api/v1")
