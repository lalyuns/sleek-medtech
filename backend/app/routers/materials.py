from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.material import Material
from app.models.user import User, UserRole
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialOut

router = APIRouter(prefix="/api/v1/materials", tags=["materials"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user


@router.get("/", response_model=List[MaterialOut])
def list_materials(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Material).filter(Material.is_active == True, Material.is_deleted == False).all()


@router.post("/", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def create_material(body: MaterialCreate, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    material = Material(name=body.name, physical_parameters=body.physical_parameters.model_dump())
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.put("/{material_id}", response_model=MaterialOut)
def update_material(material_id: int, body: MaterialUpdate, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    material = db.query(Material).filter(Material.material_id == material_id, Material.is_deleted == False).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    if body.name is not None:
        material.name = body.name
    if body.physical_parameters is not None:
        material.physical_parameters = body.physical_parameters.model_dump()
    if body.is_active is not None:
        material.is_active = body.is_active
    db.commit()
    db.refresh(material)
    return material


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(material_id: int, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    material = db.query(Material).filter(Material.material_id == material_id, Material.is_deleted == False).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    material.is_deleted = True
    material.is_active = False
    material.deleted_at = datetime.utcnow()
    db.commit()
