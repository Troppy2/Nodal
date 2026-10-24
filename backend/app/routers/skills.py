from fastapi import APIRouter

from ..models import Skill
from ..world import world

router = APIRouter()


@router.get("/skills", response_model=list[Skill])
def list_skills():
    """The skill taxonomy, by category then name."""
    return sorted(world().skills.values(), key=lambda s: (s["category"], s["name"]))
