from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.public_site_content import PublicSiteContent
from app.models.user import User, UserRole
from app.schemas.public_site_content import PublicSiteContentIn, PublicSiteContentOut

router = APIRouter(prefix="/api/v1/public-site-content", tags=["public-site-content"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user


def _get_record(db: Session) -> Optional[PublicSiteContent]:
    return db.query(PublicSiteContent).filter(PublicSiteContent.slug == "default").first()


@router.get("", response_model=PublicSiteContentOut)
def get_public_site_content(db: Session = Depends(get_db)):
    record = _get_record(db)
    return PublicSiteContentOut(content=record.content if record else {}, updated_at=record.updated_at if record else None)


@router.put("", response_model=PublicSiteContentOut)
def update_public_site_content(
    body: PublicSiteContentIn,
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    record = _get_record(db)
    if record:
        record.content = body.content
    else:
        record = PublicSiteContent(slug="default", content=body.content)
        db.add(record)

    db.commit()
    db.refresh(record)
    return PublicSiteContentOut(content=record.content, updated_at=record.updated_at)
