from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from ..config import settings
from ..db import service_client
from ..deps import get_current_user, get_optional_user
from ..ratelimit import rate_limit
from ..models import SourceFileOut, SourceTree
from ..services import source_service
from .projects import get_project_row, require_owner

router = APIRouter()


@router.post("/projects/{project_id}/source")
async def upload_source(project_id: str, file: UploadFile = File(...),
                        user: dict = Depends(rate_limit("5/hour", "source-upload"))) -> dict:
    project = require_owner(project_id, user)
    if project["source_access"] != "open":
        raise HTTPException(409, "Set source access to open before uploading")
    if not (file.filename or "").lower().endswith(".zip"):
        raise HTTPException(422, "Upload a .zip file")
    limit = settings.source_max_zip_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(422, f"Zip is over {settings.source_max_zip_mb} MB")
    return source_service.ingest(project_id, data)


def readable_project(project_id: str, viewer: dict | None) -> dict:
    """Source is public only while the project is open; the owner can always see their own."""
    project = get_project_row(project_id)
    if project["source_access"] != "open" and not (viewer and viewer["id"] == project["owner_id"]):
        raise HTTPException(404, "No source")
    return project


@router.delete("/projects/{project_id}/source", status_code=204)
def delete_source(project_id: str, user: dict = Depends(get_current_user)):
    require_owner(project_id, user)
    source_service.remove(project_id)


@router.get("/projects/{project_id}/source/tree", response_model=SourceTree)
def tree(project_id: str, viewer: dict | None = Depends(get_optional_user)):
    readable_project(project_id, viewer)
    rows = service_client().table("source_files").select("path,size_bytes,is_text").eq("project_id", project_id) \
        .order("path").execute().data
    return {"files": rows}


@router.get("/projects/{project_id}/source/file", response_model=SourceFileOut)
def read_file(project_id: str, path: str = Query(...), viewer: dict | None = Depends(get_optional_user)):
    readable_project(project_id, viewer)
    sb = service_client()
    rows = sb.table("source_files").select("id,path,size_bytes,is_text").eq("project_id", project_id).eq("path", path).execute().data
    if not rows:
        raise HTTPException(404, "File not found")
    f = rows[0]
    if not f["is_text"]:
        return {"path": f["path"], "size_bytes": f["size_bytes"], "binary": True}
    content = sb.table("source_contents").select("content").eq("file_id", f["id"]).execute().data
    return {"path": f["path"], "size_bytes": f["size_bytes"], "content": content[0]["content"] if content else ""}


@router.get("/projects/{project_id}/source/download")
def download(project_id: str, viewer: dict | None = Depends(get_optional_user)) -> dict:
    project = readable_project(project_id, viewer)
    if not project.get("source_zip_path"):
        raise HTTPException(404, "No source uploaded")
    return {"url": source_service.signed_url(project_id)}
