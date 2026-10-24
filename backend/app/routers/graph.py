from fastapi import APIRouter, Depends, Query

from ..deps import get_current_user
from ..models import Cycle, GraphOut
from ..services.graph import project_graph, serialize_cycles
from ..world import world
from .projects import known_project

router = APIRouter()


@router.get("/me/cycles", response_model=list[Cycle], response_model_by_alias=True)
def my_cycles(user: dict = Depends(get_current_user)):
    w = world()
    return serialize_cycles(w, w.matching.cycles_for(user["id"]))


@router.get("/graph/projects/{project_id}", response_model=GraphOut)
def graph_for_project(project_id: str, depth: int = Query(2, ge=1, le=2)):
    w = world()
    return project_graph(w, known_project(w, project_id), depth)
