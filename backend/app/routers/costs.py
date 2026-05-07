from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_project_access
from app.models.cost import Cost, CostType
from app.models.user import User
from app.models.user_project_mapping import AccessLevel
from app.schemas.cost import CostCreate, CostOut

router = APIRouter(prefix="/api/v1/projects", tags=["costs"])


@router.get("/{project_id}/costs", response_model=List[CostOut])
def list_costs(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    return db.query(Cost).filter(Cost.project_id == project_id, Cost.is_deleted == False).all()


@router.post("/{project_id}/costs", response_model=CostOut, status_code=status.HTTP_201_CREATED)
def create_cost(
    project_id: int,
    body: CostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_project_access(AccessLevel.edit)),
):
    try:
        cost_type = CostType(body.type)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid cost type: {body.type}")

    cost = Cost(
        project_id=project_id,
        type=cost_type,
        amount=body.amount,
        description=body.description,
    )
    db.add(cost)
    db.commit()
    db.refresh(cost)
    return cost
