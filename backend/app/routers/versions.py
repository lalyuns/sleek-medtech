from collections import deque
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_project_access
from app.models.cost import Cost
from app.models.material import Material
from app.models.model_version import ModelVersion, VersionStatus
from app.models.reference_edge import ReferenceEdge, TargetType
from app.models.user import User
from app.models.user_project_mapping import AccessLevel
from app.schemas.cost import BOMOut, CostCreate, CostOut
from app.schemas.reference_edge import ReferenceEdgeCreate, ReferenceEdgeOut, TraceabilityOut, TraceEdge, TraceNode
from app.schemas.version import VersionCreate, VersionOut

router = APIRouter(prefix="/api/v1/projects", tags=["versions"])


def _get_version_or_404(version_id: int, project_id: int, db: Session) -> ModelVersion:
    v = db.query(ModelVersion).filter(
        ModelVersion.version_id == version_id,
        ModelVersion.project_id == project_id,
        ModelVersion.is_deleted == False,
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    return v


# ── Version CRUD ──────────────────────────────────────────────────────────────

@router.get("/{project_id}/versions", response_model=List[VersionOut])
def list_versions(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    return db.query(ModelVersion).filter(
        ModelVersion.project_id == project_id,
        ModelVersion.is_deleted == False,
    ).order_by(ModelVersion.version_number).all()


@router.post("/{project_id}/versions", response_model=VersionOut, status_code=status.HTTP_201_CREATED)
def create_version(
    project_id: int,
    body: VersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_project_access(AccessLevel.edit)),
):
    last = (
        db.query(ModelVersion.version_number)
        .filter(ModelVersion.project_id == project_id, ModelVersion.is_deleted == False)
        .order_by(ModelVersion.version_number.desc())
        .first()
    )
    next_number = (last[0] + 1) if last else 1

    version = ModelVersion(
        project_id=project_id,
        uploader_id=current_user.user_id,
        material_id=body.material_id,
        file_url=body.file_url,
        version_number=next_number,
        description=body.description,
        hash_value=body.hash_value,
        total_chunks=body.total_chunks,
        status=VersionStatus.draft,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@router.get("/{project_id}/versions/{version_id}", response_model=VersionOut)
def get_version(
    project_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    return _get_version_or_404(version_id, project_id, db)


@router.post("/{project_id}/versions/{version_id}/lock", response_model=VersionOut)
def lock_version(
    project_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.admin)),
):
    version = _get_version_or_404(version_id, project_id, db)
    if version.status == VersionStatus.locked:
        raise HTTPException(status_code=400, detail="Version already locked")
    version.status = VersionStatus.locked
    db.commit()
    db.refresh(version)
    return version


# ── Reference Edges ───────────────────────────────────────────────────────────

@router.post("/{project_id}/versions/{version_id}/references", response_model=ReferenceEdgeOut, status_code=status.HTTP_201_CREATED)
def add_reference(
    project_id: int,
    version_id: int,
    body: ReferenceEdgeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.edit)),
):
    _get_version_or_404(version_id, project_id, db)
    try:
        target_type = TargetType(body.target_type)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid target_type: {body.target_type}")
    edge = ReferenceEdge(source_version_id=version_id, target_type=target_type, target_id=body.target_id)
    db.add(edge)
    db.commit()
    db.refresh(edge)
    return edge


@router.get("/{project_id}/versions/{version_id}/references", response_model=List[ReferenceEdgeOut])
def list_references(
    project_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    _get_version_or_404(version_id, project_id, db)
    return db.query(ReferenceEdge).filter(ReferenceEdge.source_version_id == version_id).all()


# ── BOM ───────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/versions/{version_id}/bom", response_model=BOMOut)
def get_bom(
    project_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    version = _get_version_or_404(version_id, project_id, db)
    material = db.query(Material).filter(Material.material_id == version.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    unit_price = float(material.physical_parameters.get("unit_price", 0))
    material_cost = (version.volume * unit_price) if version.volume is not None else None

    other_costs = db.query(Cost).filter(
        Cost.project_id == project_id,
        Cost.is_deleted == False,
    ).all()

    other_total = sum(float(c.amount) for c in other_costs)
    total = (material_cost or 0.0) + other_total

    return BOMOut(
        version_id=version_id,
        material_name=material.name,
        volume=version.volume,
        unit_price=unit_price,
        material_cost=material_cost,
        other_costs=[CostOut.model_validate(c) for c in other_costs],
        total_cost=total,
    )


# ── Traceability ──────────────────────────────────────────────────────────────

@router.get("/{project_id}/versions/{version_id}/traceability", response_model=TraceabilityOut)
def get_traceability(
    project_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    _get_version_or_404(version_id, project_id, db)

    visited_ids = set()
    queue = deque([version_id])
    nodes: List[TraceNode] = []
    edges: List[TraceEdge] = []

    while queue:
        vid = queue.popleft()
        if vid in visited_ids:
            continue
        visited_ids.add(vid)

        v = db.query(ModelVersion).filter(ModelVersion.version_id == vid, ModelVersion.is_deleted == False).first()
        if v:
            nodes.append(TraceNode(
                version_id=v.version_id,
                version_number=v.version_number,
                status=v.status.value,
                description=v.description,
            ))

        version_edges = db.query(ReferenceEdge).filter(ReferenceEdge.source_version_id == vid).all()
        for e in version_edges:
            edges.append(TraceEdge(source_version_id=e.source_version_id, target_id=e.target_id, target_type=e.target_type.value))
            if e.target_type == TargetType.old_version and e.target_id not in visited_ids:
                queue.append(e.target_id)

    return TraceabilityOut(nodes=nodes, edges=edges)
