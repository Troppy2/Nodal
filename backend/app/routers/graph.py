from fastapi import APIRouter, Depends, HTTPException, Query

from ..deps import get_current_user
from ..models import Cycle, GraphOut
from ..services.graph import cycles_for, project_graph, serialize_cycles
from ..services.matching import Snapshot

router = APIRouter()


@router.get("/me/cycles", response_model=list[Cycle], response_model_by_alias=True)
def my_cycles(user: dict = Depends(get_current_user)):
    snap = Snapshot.load()
    return serialize_cycles(snap, cycles_for(snap, user["id"]))


@router.get("/graph/projects/{project_id}", response_model=GraphOut)
def graph_for_project(project_id: str, depth: int = Query(2, ge=1, le=2)):
    snap = Snapshot.load()
    if project_id not in snap.projects:
        raise HTTPException(404, "Project not found")
    return project_graph(snap, project_id, depth)
