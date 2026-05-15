"""MinIO / S3 file storage service using aiobotocore."""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

from aiobotocore.session import get_session

from app.core.config import settings


def _s3_kwargs() -> dict:
    protocol = "https" if settings.MINIO_SECURE else "http"
    return {
        "endpoint_url": f"{protocol}://{settings.MINIO_ENDPOINT}",
        "aws_access_key_id": settings.MINIO_ACCESS_KEY,
        "aws_secret_access_key": settings.MINIO_SECRET_KEY,
    }


@asynccontextmanager
async def _client():
    session = get_session()
    async with session.create_client("s3", **_s3_kwargs()) as client:
        yield client


class FileService:
    @staticmethod
    async def ensure_bucket() -> None:
        """Create the images bucket if it does not exist (called on startup)."""
        async with _client() as s3:
            try:
                await s3.head_bucket(Bucket=settings.MINIO_BUCKET_IMAGES)
            except Exception:
                await s3.create_bucket(Bucket=settings.MINIO_BUCKET_IMAGES)

    @staticmethod
    async def upload(data: bytes, content_type: str, filename: str | None = None) -> str:
        """Upload bytes and return the object key."""
        ext = (filename.rsplit(".", 1)[-1] if filename and "." in filename else "bin")
        key = f"{uuid.uuid4()}.{ext}"
        async with _client() as s3:
            await s3.put_object(
                Bucket=settings.MINIO_BUCKET_IMAGES,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        return key

    @staticmethod
    async def download(key: str) -> bytes:
        async with _client() as s3:
            response = await s3.get_object(Bucket=settings.MINIO_BUCKET_IMAGES, Key=key)
            async with response["Body"] as stream:
                return await stream.read()

    @staticmethod
    async def delete(key: str) -> None:
        async with _client() as s3:
            await s3.delete_object(Bucket=settings.MINIO_BUCKET_IMAGES, Key=key)

    @staticmethod
    async def presigned_url(key: str, expires: int = 3600) -> str:
        """Generate a pre-signed GET URL valid for `expires` seconds."""
        async with _client() as s3:
            url = await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.MINIO_BUCKET_IMAGES, "Key": key},
                ExpiresIn=expires,
            )
        return url
