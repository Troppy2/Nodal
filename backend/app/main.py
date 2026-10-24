from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .limits import limiter
from .slugs import SlugMiddleware
from .routers import (
    auth, collab, comments, feed, graph, ideas, inbox, matches, me, messages, profiles, projects, recommendations,
    research, skills, social, source, team, tolken,
)

app = FastAPI(title="Nodal API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlugMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


for module in (
    auth, projects, skills, comments, collab, social, profiles, me, source,
    matches, graph, feed, recommendations, ideas, inbox, messages, team, tolken, research,
):
    app.include_router(module.router, prefix="/api/v1")
