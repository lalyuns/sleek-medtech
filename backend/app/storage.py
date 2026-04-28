from minio import Minio
from app.config import settings

BUCKET = "sleekmedtech"

minio_client = Minio(
    "localhost:9000",
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=False,
)


def ensure_bucket():
    if not minio_client.bucket_exists(BUCKET):
        minio_client.make_bucket(BUCKET)
