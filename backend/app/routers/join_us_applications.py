from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.join_us_application import JoinUsApplication, JoinUsApplicationStatus
from app.models.user import User, UserRole
from app.schemas.join_us_application import (
    JoinUsApplicationCreate,
    JoinUsApplicationOut,
    JoinUsApplicationUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["join-us-applications"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user


def _parse_status(value: str) -> JoinUsApplicationStatus:
    try:
        return JoinUsApplicationStatus(value)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid application status: {value}")


def _application_out(application: JoinUsApplication) -> JoinUsApplicationOut:
    return JoinUsApplicationOut(
        application_id=application.application_id,
        name=application.name,
        email=application.email,
        phone=application.phone,
        applicant_type=application.applicant_type,
        interest=application.interest,
        portfolio_url=application.portfolio_url,
        intro=application.intro,
        status=application.status.value,
        created_at=application.created_at,
    )


@router.post("/join-us/applications", response_model=JoinUsApplicationOut, status_code=status.HTTP_201_CREATED)
def create_join_us_application(body: JoinUsApplicationCreate, db: Session = Depends(get_db)):
    application = JoinUsApplication(**body.model_dump())
    db.add(application)
    db.commit()
    db.refresh(application)
    return _application_out(application)


@router.get("/join-us/applications", response_model=List[JoinUsApplicationOut])
def list_join_us_applications(db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    applications = (
        db.query(JoinUsApplication)
        .filter(JoinUsApplication.is_deleted == False)
        .order_by(JoinUsApplication.created_at.desc())
        .all()
    )
    return [_application_out(application) for application in applications]


@router.put("/join-us/applications/{application_id}", response_model=JoinUsApplicationOut)
def update_join_us_application(
    application_id: int,
    body: JoinUsApplicationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    application = (
        db.query(JoinUsApplication)
        .filter(JoinUsApplication.application_id == application_id, JoinUsApplication.is_deleted == False)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    application.status = _parse_status(body.status)
    db.commit()
    db.refresh(application)
    return _application_out(application)
