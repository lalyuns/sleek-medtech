from datetime import datetime

from sqlalchemy import delete

from app.database import SessionLocal
from app.models.feedback import Feedback
from app.models.material import Material
from app.models.model_version import ModelVersion
from app.models.project import Project
from app.models.reference_edge import ReferenceEdge
from app.models.report import Report


def cleanup_smoke_data() -> dict:
    db = SessionLocal()
    try:
        project_ids = [
            row[0]
            for row in db.query(Project.project_id)
            .filter(Project.name.like("Smoke Project%"))
            .all()
        ]
        version_ids = [
            row[0]
            for row in db.query(ModelVersion.version_id)
            .filter(ModelVersion.project_id.in_(project_ids))
            .all()
        ] if project_ids else []

        deleted = {
            "reference_edges": 0,
            "feedbacks": 0,
            "reports": 0,
            "model_versions": 0,
            "projects": 0,
            "materials": 0,
        }

        if version_ids:
            result = db.execute(delete(ReferenceEdge).where(ReferenceEdge.source_version_id.in_(version_ids)))
            deleted["reference_edges"] = result.rowcount or 0

            result = db.execute(delete(Feedback).where(Feedback.target_version_id.in_(version_ids)))
            deleted["feedbacks"] = result.rowcount or 0

            for version in db.query(ModelVersion).filter(ModelVersion.version_id.in_(version_ids)).all():
                version.is_deleted = True
                version.deleted_at = datetime.utcnow()
                deleted["model_versions"] += 1

        if project_ids:
            for report in db.query(Report).filter(Report.project_id.in_(project_ids)).all():
                report.is_deleted = True
                report.deleted_at = datetime.utcnow()
                deleted["reports"] += 1

            for project in db.query(Project).filter(Project.project_id.in_(project_ids)).all():
                project.is_deleted = True
                project.deleted_at = datetime.utcnow()
                deleted["projects"] += 1

        for material in db.query(Material).filter(Material.name.like("Smoke Ti%")).all():
            material.is_deleted = True
            material.is_active = False
            material.deleted_at = datetime.utcnow()
            deleted["materials"] += 1

        db.commit()
        return deleted
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print(cleanup_smoke_data())
