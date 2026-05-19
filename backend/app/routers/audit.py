import csv
import io
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.audit_log import AuditLog
from app.models.cost import Cost
from app.models.feedback import Feedback
from app.models.material import Material
from app.models.model_version import ModelVersion
from app.models.project import Project
from app.models.report import Report
from app.models.user import User, UserRole

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user


def _entity_context(db: Session, log: AuditLog) -> dict:
    context = {
        "actor_name": None,
        "actor_email": None,
        "entity_label": f"{log.entity_type.value} #{log.entity_id}",
        "project_id": None,
        "project_name": None,
        "version_id": None,
        "version_number": None,
    }

    actor = db.query(User).filter(User.user_id == log.user_id).first()
    if actor:
        context["actor_name"] = actor.name
        context["actor_email"] = actor.email

    def attach_project(project_id: int | None) -> None:
        if not project_id:
            return
        project = db.query(Project).filter(Project.project_id == project_id).first()
        context["project_id"] = project_id
        if project:
            context["project_name"] = project.name

    if log.entity_type.value == "model_version":
        version = db.query(ModelVersion).filter(ModelVersion.version_id == log.entity_id).first()
        if version:
            context["version_id"] = version.version_id
            context["version_number"] = version.version_number
            context["entity_label"] = f"v{version.version_number} 模型版本"
            attach_project(version.project_id)
    elif log.entity_type.value == "feedback":
        feedback = db.query(Feedback).filter(Feedback.feedback_id == log.entity_id).first()
        if feedback:
            context["entity_label"] = f"回饋 #{feedback.feedback_id}"
            version = db.query(ModelVersion).filter(ModelVersion.version_id == feedback.target_version_id).first()
            if version:
                context["version_id"] = version.version_id
                context["version_number"] = version.version_number
                context["entity_label"] = f"回饋 #{feedback.feedback_id} / v{version.version_number}"
                attach_project(version.project_id)
    elif log.entity_type.value == "report":
        report = db.query(Report).filter(Report.report_id == log.entity_id).first()
        if report:
            context["entity_label"] = report.name
            attach_project(report.project_id)
    elif log.entity_type.value == "cost":
        cost = db.query(Cost).filter(Cost.cost_id == log.entity_id).first()
        if cost:
            context["entity_label"] = f"成本 #{cost.cost_id} / {cost.type.value}"
            attach_project(cost.project_id)
    elif log.entity_type.value == "project":
        project = db.query(Project).filter(Project.project_id == log.entity_id).first()
        if project:
            context["entity_label"] = project.name
            attach_project(project.project_id)
    elif log.entity_type.value == "material":
        material = db.query(Material).filter(Material.material_id == log.entity_id).first()
        if material:
            context["entity_label"] = material.name
    elif log.entity_type.value == "user":
        user = db.query(User).filter(User.user_id == log.entity_id).first()
        if user:
            context["entity_label"] = f"{user.name} ({user.email})"

    return context


def _serialize_log(db: Session, log: AuditLog) -> dict:
    return {
        "log_id": log.log_id,
        "user_id": log.user_id,
        "action": log.action.value,
        "entity_type": log.entity_type.value,
        "entity_id": log.entity_id,
        "timestamp": log.timestamp.isoformat(),
        "ip_address": log.ip_address,
        "user_agent": log.user_agent,
        "request_id": log.request_id,
        "old_values": log.old_values,
        "new_values": log.new_values,
        **_entity_context(db, log),
    }


@router.get("/logs")
def list_audit_logs(
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    q = db.query(AuditLog)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    total = q.count()
    logs = q.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "items": [_serialize_log(db, l) for l in logs],
    }


@router.get("/logs/export.csv")
def export_audit_csv(
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    q = db.query(AuditLog)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    logs = q.order_by(AuditLog.timestamp.desc()).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "log_id",
        "actor",
        "actor_email",
        "action",
        "entity_type",
        "entity_label",
        "project",
        "version",
        "timestamp",
        "ip_address",
        "request_id",
        "old_values",
        "new_values",
    ])
    for l in logs:
        row = _serialize_log(db, l)
        writer.writerow([
            row["log_id"],
            row["actor_name"] or f"User #{row['user_id']}",
            row["actor_email"] or "",
            row["action"],
            row["entity_type"],
            row["entity_label"],
            row["project_name"] or "",
            f"v{row['version_number']}" if row["version_number"] else "",
            row["timestamp"],
            row["ip_address"],
            row["request_id"],
            json.dumps(l.old_values, ensure_ascii=False) if l.old_values else "",
            json.dumps(l.new_values, ensure_ascii=False) if l.new_values else "",
        ])

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
    )


@router.get("/export")
def export_audit_default(
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
):
    return export_audit_csv(entity_type=entity_type, user_id=user_id, db=db, _=current_user)


def _pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _simple_pdf(lines: List[str]) -> bytes:
    content_lines = ["BT", "/F1 10 Tf", "40 800 Td", "14 TL"]
    for line in lines[:52]:
        content_lines.append(f"({_pdf_escape(line[:120])}) Tj")
        content_lines.append("T*")
    content_lines.append("ET")
    stream = "\n".join(content_lines).encode("latin-1", errors="replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")
    xref_at = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF\n".encode("ascii")
    )
    return bytes(pdf)


@router.get("/logs/export.pdf")
def export_audit_pdf(
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    q = db.query(AuditLog)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    logs = q.order_by(AuditLog.timestamp.desc()).limit(50).all()

    lines = [
        "睿程生醫 Compliance Audit Package",
        f"Generated: {datetime.utcnow().isoformat()} UTC",
        f"Filters: entity_type={entity_type or 'all'}, user_id={user_id or 'all'}, project_id={project_id or 'all'}",
        "",
    ]
    if project_id:
        project = db.query(Project).filter(Project.project_id == project_id).first()
        if project:
            lines.extend([
                f"Project: {project.name}",
                f"Description: {project.description or ''}",
                f"Status: {project.status.value}",
                "",
                "Versions:",
            ])
            versions = db.query(ModelVersion).filter(ModelVersion.project_id == project_id, ModelVersion.is_deleted == False).order_by(ModelVersion.version_number).all()
            for version in versions:
                lines.append(
                    f"  v{version.version_number} | status={version.status.value} | hash={version.hash_value[:16]}... | signoff_by={version.signed_off_by or ''} | reason={(version.signoff_reason or '')[:50]}"
                )
            reports = db.query(Report).filter(Report.project_id == project_id, Report.is_deleted == False).order_by(Report.created_at).all()
            lines.append("")
            lines.append("Reports:")
            for report in reports:
                lines.append(f"  {report.report_id} | {report.report_type} | {report.name}")
            costs = db.query(Cost).filter(Cost.project_id == project_id, Cost.is_deleted == False).all()
            lines.append("")
            lines.append(f"Costs: {len(costs)} records")
            feedback_count = (
                db.query(Feedback)
                .join(ModelVersion, ModelVersion.version_id == Feedback.target_version_id)
                .filter(ModelVersion.project_id == project_id, Feedback.is_deleted == False)
                .count()
            )
            lines.append(f"Feedback records: {feedback_count}")
            lines.append("")
    lines.append("Audit Logs:")
    for log in logs:
        row = _serialize_log(db, log)
        actor = row["actor_name"] or f"User #{row['user_id']}"
        project = f" | project={row['project_name']}" if row["project_name"] else ""
        version = f" | version=v{row['version_number']}" if row["version_number"] else ""
        lines.append(
            f"{row['log_id']} | actor={actor} | {row['action']} | {row['entity_label']}{project}{version} | {row['timestamp']} | ip={row['ip_address'] or ''}"
        )
    return Response(
        content=_simple_pdf(lines),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=audit_logs.pdf"},
    )
