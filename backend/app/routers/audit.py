import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user


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
        "items": [
            {
                "log_id": l.log_id,
                "user_id": l.user_id,
                "action": l.action.value,
                "entity_type": l.entity_type.value,
                "entity_id": l.entity_id,
                "timestamp": l.timestamp.isoformat(),
            }
            for l in logs
        ],
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
    writer.writerow(["log_id", "user_id", "action", "entity_type", "entity_id", "timestamp"])
    for l in logs:
        writer.writerow([l.log_id, l.user_id, l.action.value, l.entity_type.value, l.entity_id, l.timestamp.isoformat()])

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
    )
