from minio import Minio
from app.config import settings
from datetime import timedelta
from urllib.parse import urlparse

BUCKET = "sleekmedtech"

minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE,
)


def ensure_bucket():
    if not minio_client.bucket_exists(BUCKET):
        minio_client.make_bucket(BUCKET)


def public_object_url(object_name: str) -> str:
    return f"{settings.PUBLIC_FILE_BASE_URL.rstrip('/')}/{BUCKET}/{object_name}"


def object_name_from_public_url(file_url: str) -> str | None:
    parsed = urlparse(file_url)
    path = parsed.path.lstrip("/")
    if path.startswith(f"{BUCKET}/"):
        return path[len(BUCKET) + 1:]
    if not parsed.scheme and path and not path.startswith("demo/"):
        return path
    return None


def signed_object_url(file_url: str, minutes: int = 15) -> tuple[str, int | None, str]:
    if file_url.startswith("/demo/"):
        return file_url, None, "demo"
    object_name = object_name_from_public_url(file_url)
    if not object_name:
        return file_url, None, "external"
    expires = timedelta(minutes=minutes)
    return minio_client.presigned_get_object(BUCKET, object_name, expires=expires), int(expires.total_seconds()), "signed"
