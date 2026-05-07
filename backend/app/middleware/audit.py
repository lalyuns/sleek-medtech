import json
import re
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional, Tuple

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import settings
from app.database import SessionLocal
from app.models.audit_log import AuditLog, AuditAction, AuditEntityType
from app.models.cost import Cost
from app.models.feedback import Feedback
from app.models.material import Material
from app.models.model_version import ModelVersion
from app.models.project import Project
from app.models.report import Report
from app.models.user import User

# (method, path_regex, action, entity_type, path_id_group)
# path_id_group=None means read entity_id from response body
_PATTERNS = [
    ("POST",   r"^/api/v1/materials/?$",                          "create",    "material",      None),
    ("PUT",    r"^/api/v1/materials/(\d+)/?$",                    "update",    "material",      1),
    ("DELETE", r"^/api/v1/materials/(\d+)/?$",                    "delete",    "material",      1),
    ("POST",   r"^/api/v1/projects/?$",                           "create",    "project",       None),
    ("POST",   r"^/api/v1/projects/\d+/versions/upload/init/?$",  "upload",    "model_version", None),
    ("POST",   r"^/api/v1/projects/\d+/versions/(\d+)/lock/?$",   "sign_off",  "model_version", 1),
    ("POST",   r"^/api/v1/projects/\d+/versions/\d+/feedbacks/?$","create",    "feedback",      None),
    ("PUT",    r"^/api/v1/projects/\d+/versions/\d+/feedbacks/(\d+)/?$","update", "feedback",   1),
    ("DELETE", r"^/api/v1/projects/\d+/versions/\d+/feedbacks/(\d+)/?$","delete", "feedback",   1),
    ("POST",   r"^/api/v1/projects/\d+/costs/?$",                 "create",    "cost",          None),
    ("POST",   r"^/api/v1/projects/\d+/reports/?$",               "create",    "report",        None),
    ("DELETE", r"^/api/v1/projects/\d+/reports/(\d+)/?$",         "delete",    "report",        1),
    ("POST",   r"^/api/v1/users/?$",                               "create",    "user",          None),
    ("PUT",    r"^/api/v1/users/(\d+)/?$",                         "update",    "user",          1),
    ("DELETE", r"^/api/v1/users/(\d+)/?$",                         "delete",    "user",          1),
]

_ENTITY_ID_FIELDS = {
    "material":      "material_id",
    "project":       "project_id",
    "model_version": "version_id",
    "feedback":      "feedback_id",
    "report":        "report_id",
    "cost":          "cost_id",
    "user":          "user_id",
}


def _extract_user_id(request: Request) -> Optional[int]:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return int(payload.get("user_id"))
    except (JWTError, TypeError, ValueError):
        return None


def _match_pattern(method: str, path: str) -> Optional[Tuple[str, str, Optional[int]]]:
    for pat_method, regex, action, entity_type, id_group in _PATTERNS:
        if method != pat_method:
            continue
        m = re.match(regex, path)
        if m:
            entity_id = int(m.group(id_group)) if id_group else None
            return action, entity_type, entity_id
    return None


_SNAPSHOT_MODELS = {
    "material": (Material, "material_id"),
    "project": (Project, "project_id"),
    "model_version": (ModelVersion, "version_id"),
    "feedback": (Feedback, "feedback_id"),
    "report": (Report, "report_id"),
    "cost": (Cost, "cost_id"),
    "user": (User, "user_id"),
}


def _serialize(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _snapshot(entity_type: str, entity_id: Optional[int]) -> Optional[dict]:
    if not entity_id:
        return None
    model_info = _SNAPSHOT_MODELS.get(entity_type)
    if not model_info:
        return None
    model, pk_name = model_info
    db = None
    try:
        db = SessionLocal()
        obj = db.query(model).filter(getattr(model, pk_name) == entity_id).first()
        if not obj:
            return None
        return {
            column.name: _serialize(getattr(obj, column.name))
            for column in obj.__table__.columns
            if column.name != "hashed_password"
        }
    except Exception:
        return None
    finally:
        if db:
            db.close()


def _request_id(request: Request) -> Optional[str]:
    return (
        request.headers.get("X-Request-ID")
        or request.headers.get("X-Correlation-ID")
        or request.headers.get("X-Amzn-Trace-Id")
    )


def _write_audit(
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int,
    request: Request,
    old_values: Optional[dict],
    new_values: Optional[dict],
):
    db = None
    try:
        db = SessionLocal()
        forwarded_for = request.headers.get("X-Forwarded-For")
        log = AuditLog(
            user_id=user_id,
            action=AuditAction(action),
            entity_type=AuditEntityType(entity_type),
            entity_id=entity_id,
            ip_address=(forwarded_for.split(",")[0].strip() if forwarded_for else (request.client.host if request.client else None)),
            user_agent=request.headers.get("User-Agent"),
            request_id=_request_id(request),
            old_values=old_values,
            new_values=new_values,
        )
        db.add(log)
        db.commit()
    except Exception:
        pass
    finally:
        if db:
            db.close()


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method not in ("POST", "PUT", "DELETE", "PATCH"):
            return await call_next(request)

        match = _match_pattern(request.method, request.url.path)
        if not match:
            return await call_next(request)

        action, entity_type, entity_id_from_path = match
        old_values = _snapshot(entity_type, entity_id_from_path)

        # If entity_id is in the path we don't need to read the response body
        if entity_id_from_path is not None:
            response = await call_next(request)
            if 200 <= response.status_code < 300:
                user_id = _extract_user_id(request)
                if user_id:
                    _write_audit(
                        user_id,
                        action,
                        entity_type,
                        entity_id_from_path,
                        request,
                        old_values,
                        _snapshot(entity_type, entity_id_from_path),
                    )
            return response

        # Need to buffer response to read the created entity's ID
        response = await call_next(request)
        if not (200 <= response.status_code < 300):
            return response

        body_bytes = b""
        async for chunk in response.body_iterator:
            body_bytes += chunk

        user_id = _extract_user_id(request)
        if user_id:
            try:
                body_json = json.loads(body_bytes)
                id_field = _ENTITY_ID_FIELDS.get(entity_type)
                entity_id = int(body_json[id_field]) if id_field and id_field in body_json else None
                if entity_id:
                    _write_audit(
                        user_id,
                        action,
                        entity_type,
                        entity_id,
                        request,
                        None,
                        _snapshot(entity_type, entity_id),
                    )
            except Exception:
                pass

        return Response(
            content=body_bytes,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )
