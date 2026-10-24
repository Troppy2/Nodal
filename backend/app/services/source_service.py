"""Safe zip ingestion for project source. Never executes, imports, or renders anything from the zip."""

import io
import stat
import zipfile
from datetime import datetime, timezone

from fastapi import HTTPException

from ..config import settings
from ..db import service_client

BUCKET = "source"
TEXT_MAX = 200 * 1024
TEXT_TOTAL_MAX = 5 * 1024 * 1024
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv"}


def _is_secret(name: str) -> bool:
    return name == ".env" or name.startswith(".env.")


def _skip(path: str) -> bool:
    parts = path.split("/")
    return any(p in SKIP_DIRS for p in parts[:-1]) or parts[-1] in SKIP_DIRS or _is_secret(parts[-1])


def _check_name(name: str) -> str:
    if "\\" in name or name.startswith("/") or (len(name) > 1 and name[1] == ":"):
        raise HTTPException(422, f"Unsafe path in zip: {name}")
    if any(seg == ".." for seg in name.split("/")):
        raise HTTPException(422, f"Unsafe path in zip: {name}")
    return name


def _ensure_bucket(sb) -> None:
    try:
        sb.storage.get_bucket(BUCKET)
    except Exception:
        sb.storage.create_bucket(BUCKET, options={"public": False})


def read_zip(data: bytes) -> tuple[list[tuple[str, bytes]], int]:
    """Validate and expand a zip. Returns ([(path, bytes)], skipped_count). Raises 422 on anything unsafe."""
    max_zip = settings.source_max_zip_mb * 1024 * 1024
    max_total = settings.source_max_uncompressed_mb * 1024 * 1024
    if len(data) > max_zip:
        raise HTTPException(422, f"Zip is over {settings.source_max_zip_mb} MB")
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        raise HTTPException(422, "Not a valid zip file")

    infos = [i for i in zf.infolist() if not i.is_dir()]
    if len(infos) > settings.source_max_files:
        raise HTTPException(422, f"Zip has more than {settings.source_max_files} files")
    if sum(i.file_size for i in infos) > max_total:
        raise HTTPException(422, f"Zip expands past {settings.source_max_uncompressed_mb} MB")
    for i in zf.infolist():
        _check_name(i.filename)
        if stat.S_ISLNK(i.external_attr >> 16):
            raise HTTPException(422, f"Symlinks are not allowed: {i.filename}")

    names = [i.filename for i in infos]
    tops = {n.split("/", 1)[0] for n in names}
    strip = len(tops) == 1 and all("/" in n for n in names)

    files, skipped, read_total = [], 0, 0
    for i in infos:
        path = i.filename.split("/", 1)[1] if strip else i.filename
        if not path or _skip(path):
            skipped += 1
            continue
        with zf.open(i) as fh:
            content = fh.read(i.file_size + 1)
        read_total += len(content)
        if len(content) > i.file_size or read_total > max_total:
            raise HTTPException(422, "Zip expands past its declared size")
        files.append((path, content))
    return files, skipped


def ingest(project_id: str, data: bytes) -> dict:
    """Replace a project's source with this zip. Returns {file_count, skipped_count}."""
    files, skipped = read_zip(data)
    sb = service_client()
    sb.table("source_files").delete().eq("project_id", project_id).execute()

    text_budget = TEXT_TOTAL_MAX
    for path, content in sorted(files):
        text = None
        if len(content) < TEXT_MAX and len(content) <= text_budget:
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                text = None
        row = sb.table("source_files").insert(
            {"project_id": project_id, "path": path, "size_bytes": len(content), "is_text": text is not None}
        ).execute().data[0]
        if text is not None:
            text_budget -= len(content)
            sb.table("source_contents").insert({"file_id": row["id"], "content": text}).execute()

    _ensure_bucket(sb)
    key = f"{project_id}/source.zip"
    sb.storage.from_(BUCKET).upload(key, data, {"content-type": "application/zip", "upsert": "true"})
    sb.table("projects").update({
        "source_zip_path": key, "source_size_bytes": len(data),
        "source_uploaded_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", project_id).execute()
    return {"file_count": len(files), "skipped_count": skipped}


def remove(project_id: str) -> None:
    sb = service_client()
    sb.table("source_files").delete().eq("project_id", project_id).execute()
    try:
        sb.storage.from_(BUCKET).remove([f"{project_id}/source.zip"])
    except Exception:
        pass
    sb.table("projects").update({"source_zip_path": None, "source_size_bytes": None, "source_uploaded_at": None}) \
        .eq("id", project_id).execute()


def signed_url(project_id: str) -> str:
    res = service_client().storage.from_(BUCKET).create_signed_url(f"{project_id}/source.zip", 60)
    return res.get("signedURL") or res.get("signedUrl") or res["signed_url"]
