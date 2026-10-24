from fastapi import APIRouter

from ..db import service_client
from ..models import Skill

router = APIRouter()


@router.get("/skills", response_model=list[Skill])
def list_skills():
    return service_client().table("skills").select("*").order("category").order("name").execute().data
