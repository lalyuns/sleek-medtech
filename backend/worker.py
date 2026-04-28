"""
RQ worker task — called by the RQ worker process after chunked upload completes.
Run the worker with:  rq worker --url redis://localhost:6379/0
"""
import hashlib
import io
import os
import tempfile

from stl import mesh as stl_mesh

from app.config import settings
from app.database import SessionLocal
from app.models.model_version import ModelVersion, VersionStatus
from app.storage import minio_client, ensure_bucket, BUCKET


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

        # Assemble chunks
        file_data = _fetch_and_assemble(version_id)

        # Verify SHA-256
        actual_hash = hashlib.sha256(file_data).hexdigest()
        if actual_hash != version.hash_value:
            raise ValueError(f"Hash mismatch: expected {version.hash_value}, got {actual_hash}")

        # Compute volume from STL
        volume = _calculate_volume(file_data)

        # Upload assembled file to final location
        ensure_bucket()
        final_key = f"models/{version_id}/model.stl"
        minio_client.put_object(
            BUCKET, final_key, io.BytesIO(file_data), length=len(file_data),
            content_type="model/stl",
        )

        # Build public-style URL (MinIO internal URL)
        file_url = f"http://localhost:9000/{BUCKET}/{final_key}"

        # Update version record
        version.file_url = file_url
        version.volume = volume
        version.status = VersionStatus.draft
        db.commit()

        # Clean up temp chunks
        _delete_chunks(version_id)

    except Exception as exc:
        db.rollback()
        # Mark version as failed by keeping status=uploading so operators can retry
        raise
    finally:
        db.close()
