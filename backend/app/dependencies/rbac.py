from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User, UserRole
from app.models.user_project_mapping import UserProjectMapping, AccessLevel


def require_project_access(min_level: AccessLevel = AccessLevel.read_only):
    def _checker(
        project_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if current_user.role == UserRole.admin:
            return current_user
        mapping = (
            db.query(UserProjectMapping)
            .filter(
                UserProjectMapping.user_id == current_user.user_id,
                UserProjectMapping.project_id == project_id,
            )
            .first()
        )
        if not mapping:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to this project")
        level_order = [AccessLevel.read_only, AccessLevel.edit, AccessLevel.admin]
        if level_order.index(mapping.access_level) < level_order.index(min_level):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient project access level")
        return current_user
    return _checker
