from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from passlib.context import CryptContext

from app.database import SessionLocal
from app.main import app
from app.models.material import Material
from app.models.model_version import ModelVersion, VersionStatus
from app.models.user import User, UserRole
from cleanup_smoke_data import cleanup_smoke_data


client = TestClient(app)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def ensure_admin():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "admin@sleek.com", User.is_deleted == False).first()
        if not user:
            db.add(User(
                name="Admin",
                email="admin@sleek.com",
                hashed_password=pwd_context.hash("admin1234"),
                role=UserRole.admin,
            ))
            db.commit()
    finally:
        db.close()


def auth_headers():
    ensure_admin()
    response = client.post("/api/v1/auth/login", json={"email": "admin@sleek.com", "password": "admin1234"})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, response.json()["refresh_token"]


def test_api_smoke_flow():
    cleanup_smoke_data()
    headers, refresh_token = auth_headers()

    refresh_response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_response.status_code == 200, refresh_response.text
    assert refresh_response.json()["refresh_token"] != refresh_token

    material_response = client.post("/api/v1/materials/", headers=headers, json={
        "name": "Smoke Ti Pytest",
        "physical_parameters": {"density": 4.43, "tensile_strength": 950.0, "unit_price": 450.0, "unit_price_unit": "per_g"},
    })
    assert material_response.status_code == 201, material_response.text
    material = material_response.json()

    db = SessionLocal()
    try:
        inactive = Material(
            name="Smoke Ti Inactive Pytest",
            physical_parameters={"density": 1.0, "tensile_strength": 1.0, "unit_price": 1.0, "unit_price_unit": "per_g"},
            is_active=False,
        )
        db.add(inactive)
        db.commit()
    finally:
        db.close()
    materials_response = client.get("/api/v1/materials/", headers=headers)
    assert materials_response.status_code == 200, materials_response.text
    assert all(item["is_active"] for item in materials_response.json())
    assert all(item["name"] != "Smoke Ti Inactive Pytest" for item in materials_response.json())

    project_response = client.post("/api/v1/projects/", headers=headers, json={
        "name": "Smoke Project Pytest",
        "description": "pytest smoke test",
    })
    assert project_response.status_code == 201, project_response.text
    project = project_response.json()

    upload_init_response = client.post(
        f"/api/v1/projects/{project['project_id']}/versions/upload/init",
        headers=headers,
        data={
            "material_id": str(material["material_id"]),
            "total_chunks": "1",
            "hash_value": "a" * 64,
            "description": "pytest version",
        },
    )
    assert upload_init_response.status_code == 201, upload_init_response.text
    version_id = upload_init_response.json()["version_id"]

    db = SessionLocal()
    try:
        version_obj = db.query(ModelVersion).filter(ModelVersion.version_id == version_id).first()
        assert version_obj is not None
        version_obj.file_url = "http://example.test/model.stl"
        version_obj.volume = 10.0
        version_obj.status = VersionStatus.draft
        db.commit()
    finally:
        db.close()

    version_response = client.get(f"/api/v1/projects/{project['project_id']}/versions/{version_id}", headers=headers)
    assert version_response.status_code == 200, version_response.text
    version = version_response.json()

    bom_response = client.get(f"/api/v1/projects/{project['project_id']}/versions/{version['version_id']}/bom", headers=headers)
    assert bom_response.status_code == 200, bom_response.text
    bom = bom_response.json()
    assert bom["volume_unit"] == "mm3"
    assert bom["material_volume_cm3"] == pytest.approx(0.01)
    assert bom["material_quantity"] == pytest.approx(0.0443)
    assert bom["unit_price_unit"] == "per_g"
    assert bom["total_cost"] == pytest.approx(19.935)

    feedback_response = client.post(
        f"/api/v1/projects/{project['project_id']}/versions/{version['version_id']}/feedbacks",
        headers=headers,
        json={"content": "coordinate smoke feedback", "coordinates": {"x": 1, "y": 2, "z": 3}},
    )
    assert feedback_response.status_code == 201, feedback_response.text
    assert feedback_response.json()["coordinates"]["z"] == 3

    report_response = client.post(
        f"/api/v1/projects/{project['project_id']}/reports",
        headers=headers,
        data={"name": "Smoke report"},
        files={"file": ("report.txt", BytesIO(b"smoke report"), "text/plain")},
    )
    assert report_response.status_code == 201, report_response.text

    trace_response = client.get(f"/api/v1/projects/{project['project_id']}/versions/{version['version_id']}/traceability", headers=headers)
    assert trace_response.status_code == 200, trace_response.text
    assert len(trace_response.json()["nodes"]) >= 1
    version_node = next(node for node in trace_response.json()["nodes"] if node["data"]["kind"] == "model_version")
    assert "timestamp" in version_node["data"]
    assert "signoff_user_snapshot" in version_node["data"]

    audit_response = client.get("/api/v1/audit/logs?limit=5", headers=headers)
    assert audit_response.status_code == 200, audit_response.text
    first_audit_item = audit_response.json()["items"][0]
    assert "ip_address" in first_audit_item
    assert "actor_name" in first_audit_item
    assert "entity_label" in first_audit_item

    pdf_response = client.get("/api/v1/audit/logs/export.pdf", headers=headers)
    assert pdf_response.status_code == 200, pdf_response.text
    assert pdf_response.headers["content-type"] == "application/pdf"

    cleanup_smoke_data()
