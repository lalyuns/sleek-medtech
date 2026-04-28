from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_project_access
from app.models.project import Project, ProjectStatus
from app.models.user import User, UserRole
from app.models.user_project_mapping import UserProjectMapping, AccessLevel
from app.schemas.project import ProjectCreate, ProjectOut

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


@router.get("/", response_model=List[ProjectOut])
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.admin:
        return db.query(Project).filter(Project.is_deleted == False).all()
    accessible_ids = (
        db.query(UserProjectMapping.project_id)
        .filter(UserProjectMapping.user_id == current_user.user_id)
        .subquery()
    )
    return (
        db.query(Project)
        .filter(Project.project_id.in_(accessible_ids), Project.is_deleted == False)
        .all()
    )


@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = Project(name=body.name, description=body.description, owner_id=current_user.user_id)
    db.add(project)
    db.flush()
    mapping = UserProjectMapping(
        user_id=current_user.user_id,
        project_id=project.project_id,
        access_level=AccessLevel.admin,
    )
    db.add(mapping)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    project = db.query(Project).filter(Project.project_id == project_id, Project.is_deleted == False).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


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
    db.commit()
