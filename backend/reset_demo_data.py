from datetime import datetime

from sqlalchemy import delete, or_

from app.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.cost import Cost
from app.models.feedback import Feedback
from app.models.material import Material
from app.models.model_version import ModelVersion
from app.models.project import Project
from app.models.reference_edge import ReferenceEdge
from app.models.report import Report
from app.models.user_project_mapping import UserProjectMapping
from cleanup_smoke_data import cleanup_smoke_data
from seed_scenario import main as seed_scenario


SCENARIO_CODES = ("MR-2026-041", "CM-2026-017")


def reset_demo_data() -> dict:
    deleted = {"smoke": cleanup_smoke_data(), "scenario_projects": 0, "scenario_versions": 0}
    db = SessionLocal()
    try:
        scenario_project_ids = [
            row[0]
            for row in db.query(Project.project_id)
            .filter(Project.name.like("%MR-2026-041%") | Project.name.like("%CM-2026-017%"))
            .all()
        ]
        placeholder_project_ids = [
            row[0]
            for row in db.query(Project.project_id)
            .outerjoin(ModelVersion, ModelVersion.project_id == Project.project_id)
            .filter(or_(Project.name.like("%專案0%"), ModelVersion.file_url == "placeholder"))
            .all()
        ]
        project_ids = list(dict.fromkeys(scenario_project_ids + placeholder_project_ids))
        version_ids = [
            row[0]
            for row in db.query(ModelVersion.version_id)
            .filter(ModelVersion.project_id.in_(project_ids))
            .all()
        ] if project_ids else []

        if version_ids:
            db.execute(delete(ReferenceEdge).where(ReferenceEdge.source_version_id.in_(version_ids)))
            db.execute(delete(Feedback).where(Feedback.target_version_id.in_(version_ids)))
            deleted["scenario_versions"] = len(version_ids)

        if project_ids:
            db.execute(delete(Cost).where(Cost.project_id.in_(project_ids)))
            db.execute(delete(UserProjectMapping).where(UserProjectMapping.project_id.in_(project_ids)))
            for report in db.query(Report).filter(Report.project_id.in_(project_ids)).all():
                report.is_deleted = True
                report.deleted_at = datetime.utcnow()
            for version in db.query(ModelVersion).filter(ModelVersion.project_id.in_(project_ids)).all():
                version.is_deleted = True
                version.deleted_at = datetime.utcnow()
            for project in db.query(Project).filter(Project.project_id.in_(project_ids)).all():
                project.is_deleted = True
                project.deleted_at = datetime.utcnow()
                deleted["scenario_projects"] += 1
            db.execute(delete(AuditLog).where(AuditLog.request_id.like("scenario-%")))

        for material in db.query(Material).filter(
            Material.name.in_(["Titanium Ti-6Al-4V ELI", "Medical stainless steel 316L", "Medical grade PEEK"])
        ).all():
            material.is_deleted = True
            material.is_active = False
            material.deleted_at = datetime.utcnow()

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    seed_scenario()
    return deleted


if __name__ == "__main__":
    print(reset_demo_data())
