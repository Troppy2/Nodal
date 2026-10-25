"""Image upload router: uploads images to Supabase public storage and returns the permanent public URL."""

import uuid
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from ..db import service_client
from ..deps import get_current_user
from ..limits import limiter

router = APIRouter()
BUCKET = "images"
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/svg+xml"}
MAX_SIZE = 8 * 1024 * 1024  # 8 MB


def _ensure_images_bucket():
    sb = service_client()
    try:
        sb.storage.get_bucket(BUCKET)
    except Exception:
        try:
            sb.storage.create_bucket(BUCKET, options={"public": True})
        except Exception:
            pass


@router.post("/upload/image")
@limiter.limit("30/minute")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    content_type = file.content_type or "image/png"
    if content_type not in ALLOWED_TYPES and not content_type.startswith("image/"):
        raise HTTPException(415, "Only images (PNG, JPEG, WebP, GIF, SVG) are allowed")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(413, "Image file must be under 8 MB")

    _ensure_images_bucket()
    sb = service_client()

    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "png"
    if ext not in {"png", "jpg", "jpeg", "webp", "gif", "svg"}:
        ext = "png"
    file_key = f"{user['id']}/{uuid.uuid4().hex}.{ext}"

    try:
        sb.storage.from_(BUCKET).upload(
            file_key,
            data,
            {"content-type": content_type, "upsert": "true"},
        )
        public_url = sb.storage.from_(BUCKET).get_public_url(file_key)
        return {"url": public_url, "name": file.filename}
    except Exception as e:
        raise HTTPException(502, f"Failed to upload image: {e}")
