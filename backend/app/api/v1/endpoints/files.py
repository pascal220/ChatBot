from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.core.dependencies import get_current_user
from app.db.models.user import User
from app.services.files import FileService

router = APIRouter()

_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/tiff",
}
_MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

    data = await file.read()
    if len(data) > _MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 20 MB limit")

    key = await FileService.upload(data, file.content_type, file.filename)
    return {"key": key}


@router.get("/{key}/url")
async def get_presigned_url(
    key: str,
    current_user: User = Depends(get_current_user),
):
    url = await FileService.presigned_url(key)
    return {"url": url}


@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    key: str,
    current_user: User = Depends(get_current_user),
):
    await FileService.delete(key)
