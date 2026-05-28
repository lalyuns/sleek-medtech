from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_project_access
from app.models.project import Project
from app.models.audit_log import AuditLog
from app.models.product import Product, ProductStatus
from app.models.project_member import ProjectAccessLevel, ProjectMember
from app.models.user import User, UserRole
from app.models.user_project_mapping import UserProjectMapping, AccessLevel
from app.schemas.project import ProjectCreate, ProjectOut
from app.schemas.user import ProjectMemberOut
from app.services.events import record_event

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


def _access_level_for(project_id: int, current_user: User, db: Session) -> str | None:
    if current_user.role == UserRole.admin:
        return AccessLevel.admin.value
    mapping = db.query(UserProjectMapping).filter(
        UserProjectMapping.project_id == project_id,
        UserProjectMapping.user_id == current_user.user_id,
    ).first()
    return mapping.access_level.value if mapping else None


def _project_out(project: Project, current_user: User, db: Session) -> ProjectOut:
    return ProjectOut(
        project_id=project.project_id,
        name=project.name,
        description=project.description,
        status=project.status.value,
        owner_id=project.owner_id,
        product_id=project.product_id,
        product_name=project.product_name,
        material_name=project.material_name,
        updated_at=project.updated_at,
        current_access_level=_access_level_for(project.project_id, current_user, db),
    )


@router.get("/", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.admin:
        projects = db.query(Project).filter(Project.is_deleted == False).all()
        return [_project_out(project, current_user, db) for project in projects]
    accessible_ids = (
        db.query(UserProjectMapping.project_id)
        .filter(UserProjectMapping.user_id == current_user.user_id)
        .subquery()
    )
    projects = (
        db.query(Project)
        .filter(Project.project_id.in_(accessible_ids), Project.is_deleted == False)
        .all()
    )
    return [_project_out(project, current_user, db) for project in projects]


@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if body.product_id is not None:
        product = db.query(Product).filter(
            Product.product_id == body.product_id,
            Product.status == ProductStatus.active,
            Product.is_deleted == False,
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
    project = Project(
        name=body.name,
        description=body.description,
        owner_id=current_user.user_id,
        product_id=body.product_id,
        product_name=body.product_name,
        material_name=body.material_name,
    )
    db.add(project)
    db.flush()
    mapping = UserProjectMapping(
        user_id=current_user.user_id,
        project_id=project.project_id,
        access_level=AccessLevel.admin,
    )
    db.add(mapping)
    db.add(ProjectMember(
        user_id=current_user.user_id,
        project_id=project.project_id,
        access_level=ProjectAccessLevel.admin,
    ))
    record_event(
        db,
        project_id=project.project_id,
        actor_id=current_user.user_id,
        event_type="project.created",
        target_type="project",
        target_id=project.project_id,
        summary=f"建立專案：{project.name}",
        payload_json={
            "product_name": project.product_name,
            "material_name": project.material_name,
        },
    )
    db.commit()
    db.refresh(project)
    return _project_out(project, current_user, db)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    project = db.query(Project).filter(Project.project_id == project_id, Project.is_deleted == False).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_out(project, _, db)


@router.post("/{project_id}/members", status_code=status.HTTP_204_NO_CONTENT)
def add_member(
    project_id: int,
    user_id: int,
    access_level: AccessLevel = AccessLevel.read_only,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.admin)),
):
    existing = db.query(UserProjectMapping).filter(
        UserProjectMapping.project_id == project_id,
        UserProjectMapping.user_id == user_id,
    ).first()
    if existing:
        existing.access_level = access_level
    else:
        db.add(UserProjectMapping(user_id=user_id, project_id=project_id, access_level=access_level))
    native = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
    ).first()
    native_level = ProjectAccessLevel(access_level.value)
    if native:
        native.access_level = native_level
    else:
        db.add(ProjectMember(user_id=user_id, project_id=project_id, access_level=native_level))
    db.commit()


@router.get("/{project_id}/members", response_model=List[ProjectMemberOut])
def list_members(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.admin)),
):
    rows = (
        db.query(UserProjectMapping, User)
        .join(User, User.user_id == UserProjectMapping.user_id)
        .filter(
            UserProjectMapping.project_id == project_id,
            User.is_deleted == False,
        )
        .order_by(UserProjectMapping.mapping_id)
        .all()
    )
    return [
        ProjectMemberOut(
            mapping_id=mapping.mapping_id,
            user_id=user.user_id,
            project_id=mapping.project_id,
            access_level=mapping.access_level.value,
            name=user.name,
            email=user.email,
            role=user.role.value,
            last_activity_at=(
                db.query(AuditLog.timestamp)
                .filter(AuditLog.user_id == user.user_id)
                .order_by(AuditLog.timestamp.desc())
                .limit(1)
                .scalar()
            ),
        )
        for mapping, user in rows
    ]


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.admin)),
):
    mapping = db.query(UserProjectMapping).filter(
        UserProjectMapping.project_id == project_id,
        UserProjectMapping.user_id == user_id,
    ).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Project member not found")
    db.delete(mapping)
    native = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
    ).first()
    if native:
        db.delete(native)
    db.commit()
