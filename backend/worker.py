"""
RQ worker task invoked after chunked upload completes.
Run with: rq worker --url redis://localhost:6379/0
"""
import hashlib
import io
import os
import tempfile

from rq import get_current_job
from stl import mesh as stl_mesh

from app.database import SessionLocal
from app.models.model_version import ModelVersion, VersionStatus
from app.storage import minio_client, ensure_bucket, BUCKET, public_object_url


def _set_progress(version_id: int, status: str, progress: int, message: str = ""):
    job = get_current_job()
    if job:
        job.meta["status"] = status
        job.meta["progress"] = progress
        job.meta["message"] = message
        job.save_meta()


def _fetch_and_assemble(version_id: int) -> bytes:
    chunks = sorted(
        minio_client.list_objects(BUCKET, prefix=f"tmp/{version_id}/"),
        key=lambda o: o.object_name,
    )
    buf = io.BytesIO()
    for obj in chunks:
        response = minio_client.get_object(BUCKET, obj.object_name)
        try:
            buf.write(response.read())
        finally:
            response.close()
            response.release_conn()
    return buf.getvalue()


def _calculate_volume(stl_data: bytes) -> float:
    with tempfile.NamedTemporaryFile(suffix=".stl", delete=False) as f:
        f.write(stl_data)
        tmp_path = f.name
    try:
        m = stl_mesh.Mesh.from_file(tmp_path)
        volume, _, _ = m.get_mass_properties()
        return abs(float(volume))
    finally:
        os.unlink(tmp_path)


def _delete_chunks(version_id: int):
    objects = list(minio_client.list_objects(BUCKET, prefix=f"tmp/{version_id}/"))
    for obj in objects:
        minio_client.remove_object(BUCKET, obj.object_name)


def process_upload(version_id: int):
    db = SessionLocal()
    try:
        version = db.query(ModelVersion).filter(ModelVersion.version_id == version_id).first()
        if not version:
            return

        _set_progress(version_id, "PROCESSING", 20, "正在合併分塊")
        file_data = _fetch_and_assemble(version_id)

        _set_progress(version_id, "PROCESSING", 40, "正在驗證 SHA-256")
        actual_hash = hashlib.sha256(file_data).hexdigest()
        if actual_hash != version.hash_value:
            raise ValueError(f"Hash mismatch: expected {version.hash_value}, got {actual_hash}")

        _set_progress(version_id, "PROCESSING", 60, "正在解析 STL 體積")
        volume = _calculate_volume(file_data)

        _set_progress(version_id, "PROCESSING", 80, "正在寫入模型檔案")
        ensure_bucket()
        final_key = f"models/{version_id}/model.stl"
        minio_client.put_object(
            BUCKET, final_key, io.BytesIO(file_data), length=len(file_data),
            content_type="model/stl",
        )

        version.file_url = public_object_url(final_key)
        version.volume = volume
        version.status = VersionStatus.draft
        db.commit()

        _delete_chunks(version_id)
        _set_progress(version_id, "DONE", 100, "上傳完成")

    except Exception as exc:
        db.rollback()
        _set_progress(version_id, "FAILED", 100, str(exc))
        raise
    finally:
        db.close()
