from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .slugs import SlugMiddleware
from .routers import (
    collab, comments, feed, graph, ideas, inbox, matches, me, profiles, projects, recommendations, research,
    skills, social, source, team, tolken,
)

app = FastAPI(title="Nodal API")
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
    projects, skills, comments, collab, social, profiles, me, source,
    matches, graph, feed, recommendations, ideas, inbox, team, tolken, research,
):
    app.include_router(module.router, prefix="/api/v1")
