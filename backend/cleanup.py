from datetime import datetime, timedelta, timezone

from app.storage import BUCKET, ensure_bucket, minio_client


def cleanup_tmp_uploads(max_age_hours: int = 24) -> int:
    ensure_bucket()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    removed = 0
    for obj in minio_client.list_objects(BUCKET, prefix="tmp/", recursive=True):
        if obj.last_modified and obj.last_modified < cutoff:
            minio_client.remove_object(BUCKET, obj.object_name)
            removed += 1
    return removed


if __name__ == "__main__":
    removed_count = cleanup_tmp_uploads()
    print(f"Removed {removed_count} abandoned upload chunks")
