from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy import literal, select
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.dependencies.rbac import require_project_access
from app.models.cost import Cost
from app.models.feedback import Feedback
from app.models.material import Material
from app.models.model_version import ModelVersion, VersionStatus
from app.models.product import Product
from app.models.project import Project
from app.models.reference_edge import ReferenceEdge, TargetType
from app.models.report import Report
from app.models.user import User, UserRole
from app.models.user_project_mapping import AccessLevel
from app.storage import signed_object_url
from app.schemas.cost import BOMOut, BOMProductContext, BOMVersionContext, CostOut
from app.schemas.reference_edge import ReferenceEdgeCreate, ReferenceEdgeOut, TraceabilityOut, TraceEdge, TraceNode
from app.schemas.version import VersionLockRequest, VersionOut
from app.services.events import record_event

router = APIRouter(prefix="/api/v1/projects", tags=["versions"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _get_version_or_404(version_id: int, project_id: int, db: Session) -> ModelVersion:
    version = db.query(ModelVersion).filter(
        ModelVersion.version_id == version_id,
        ModelVersion.project_id == project_id,
        ModelVersion.is_deleted == False,
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


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
    body: VersionLockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_project_access(AccessLevel.read_only)),
):
    if current_user.role not in (UserRole.doctor, UserRole.admin):
        raise HTTPException(status_code=403, detail="Only doctors or system admins can sign off versions")
    if not body.reason.strip():
        raise HTTPException(status_code=422, detail="Sign-off reason is required")
    if not pwd_context.verify(body.password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Password confirmation failed")

    version = _get_version_or_404(version_id, project_id, db)
    if version.status == VersionStatus.locked:
        raise HTTPException(status_code=400, detail="Version already locked")
    if version.status == VersionStatus.uploading:
        raise HTTPException(status_code=400, detail="Uploading versions cannot be signed off")

    version.status = VersionStatus.locked
    version.signed_off_by = current_user.user_id
    version.signed_off_at = datetime.utcnow()
    version.signoff_reason = body.reason.strip()
    version.signoff_user_snapshot = {
        "user_id": current_user.user_id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
    }
    record_event(
        db,
        project_id=project_id,
        actor_id=current_user.user_id,
        event_type="file.signed_off",
        target_type="model_version",
        target_id=version.version_id,
        summary=f"簽核 3D 模型 v{version.version_number}",
        payload_json={"reason": version.signoff_reason},
    )
    db.commit()
    db.refresh(version)
    return version


@router.get("/{project_id}/versions/{version_id}/file-url")
def get_version_file_url(
    project_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    version = _get_version_or_404(version_id, project_id, db)
    if not version.file_url:
        raise HTTPException(status_code=404, detail="Version file is not ready")
    signed, expires_in, mode = signed_object_url(version.file_url)
    return {"file_url": signed, "expires_in": expires_in, "mode": mode}


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

    if target_type == TargetType.old_version:
        _get_version_or_404(body.target_id, project_id, db)
    elif target_type == TargetType.feedback:
        target = (
            db.query(Feedback)
            .join(ModelVersion, ModelVersion.version_id == Feedback.target_version_id)
            .filter(
                Feedback.feedback_id == body.target_id,
                Feedback.is_deleted == False,
                ModelVersion.project_id == project_id,
                ModelVersion.is_deleted == False,
            )
            .first()
        )
        if not target:
            raise HTTPException(status_code=404, detail="Feedback target not found in this project")
    elif target_type == TargetType.report:
        target = db.query(Report).filter(
            Report.report_id == body.target_id,
            Report.project_id == project_id,
            Report.is_deleted == False,
        ).first()
        if not target:
            raise HTTPException(status_code=404, detail="Report target not found in this project")

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


def _build_bom(project_id: int, version_id: int, db: Session) -> BOMOut:
    version = _get_version_or_404(version_id, project_id, db)
    project = db.query(Project).filter(Project.project_id == project_id, Project.is_deleted == False).first()
    product = None
    if project and project.product_id:
        product = db.query(Product).filter(
            Product.product_id == project.product_id,
            Product.is_deleted == False,
        ).first()
    material = db.query(Material).filter(
        Material.material_id == version.material_id,
        Material.is_deleted == False,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    density = float(material.physical_parameters.get("density", 0))
    unit_price = float(material.physical_parameters.get("unit_price", 0))
    unit_price_unit = str(material.physical_parameters.get("unit_price_unit", "per_g"))
    material_volume_cm3 = (version.volume / 1000.0) if version.volume is not None else None
    material_quantity = (material_volume_cm3 * density) if material_volume_cm3 is not None else None
    material_cost = (material_quantity * unit_price) if material_quantity is not None else None

    other_costs = db.query(Cost).filter(
        Cost.project_id == project_id,
        Cost.is_deleted == False,
    ).all()
    labor_cost = sum(float(c.amount) for c in other_costs if c.type.value == "labor")
    external_sample_cost = sum(float(c.amount) for c in other_costs if c.type.value == "external_sample")
    total = (material_cost or 0.0) + labor_cost + external_sample_cost

    return BOMOut(
        version_id=version_id,
        product=(
            BOMProductContext(
                product_id=product.product_id,
                name=product.name,
                sku=product.sku,
                description=product.description,
                body_region=product.body_region,
                clinical_use=product.clinical_use,
                surgical_stage=product.surgical_stage,
                indication=product.indication,
            )
            if product else None
        ),
        version=BOMVersionContext(
            version_id=version.version_id,
            version_number=version.version_number,
            status=version.status.value,
            description=version.description,
        ),
        material_name=material.name,
        volume=version.volume,
        volume_unit="mm3",
        material_volume_cm3=material_volume_cm3,
        density=density,
        density_unit="g/cm3",
        unit_price=unit_price,
        unit_price_unit=unit_price_unit,
        material_quantity=material_quantity,
        material_quantity_unit="g",
        material_cost=material_cost,
        labor_cost=labor_cost,
        external_sample_cost=external_sample_cost,
        other_costs=[CostOut.model_validate(c) for c in other_costs],
        total_cost=total,
    )


@router.get("/{project_id}/bom", response_model=BOMOut)
def get_latest_bom(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    latest = (
        db.query(ModelVersion.version_id)
        .filter(
            ModelVersion.project_id == project_id,
            ModelVersion.is_deleted == False,
            ModelVersion.status != VersionStatus.uploading,
        )
        .order_by(ModelVersion.version_number.desc())
        .first()
    )
    if not latest:
        raise HTTPException(status_code=404, detail="No completed model version found")
    return _build_bom(project_id, latest[0], db)


@router.get("/{project_id}/versions/{version_id}/bom", response_model=BOMOut)
def get_bom(
    project_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    return _build_bom(project_id, version_id, db)


@router.get("/{project_id}/versions/{version_id}/traceability", response_model=TraceabilityOut)
def get_traceability(
    project_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_project_access(AccessLevel.read_only)),
):
    _get_version_or_404(version_id, project_id, db)

    seed = select(literal(version_id).label("version_id")).cte("trace_versions", recursive=True)
    parent_edges = (
        select(ReferenceEdge.target_id.label("version_id"))
        .join(seed, ReferenceEdge.source_version_id == seed.c.version_id)
        .join(ModelVersion, ModelVersion.version_id == ReferenceEdge.target_id)
        .where(
            ReferenceEdge.target_type == TargetType.old_version,
            ModelVersion.project_id == project_id,
            ModelVersion.is_deleted == False,
        )
    )
    trace_versions = seed.union_all(parent_edges)
    version_ids = [row[0] for row in db.execute(select(trace_versions.c.version_id)).all()]
    version_ids = list(dict.fromkeys(version_ids))

    versions = db.query(ModelVersion).filter(
        ModelVersion.version_id.in_(version_ids),
        ModelVersion.project_id == project_id,
        ModelVersion.is_deleted == False,
    ).all()
    versions_by_id = {v.version_id: v for v in versions}

    nodes: List[TraceNode] = []
    edges: List[TraceEdge] = []

    for index, vid in enumerate(version_ids):
        version = versions_by_id.get(vid)
        if not version:
            continue
        nodes.append(TraceNode(
            id=f"version-{version.version_id}",
            position={"x": float(index * 220), "y": 0.0},
            data={
                "label": f"v{version.version_number}",
                "kind": "model_version",
                "status": version.status.value,
                "description": version.description,
                "hash_value": version.hash_value,
                "material_id": version.material_id,
                "version_id": version.version_id,
                "timestamp": version.timestamp.isoformat() if version.timestamp else None,
                "signed_off_by": version.signed_off_by,
                "signed_off_at": version.signed_off_at.isoformat() if version.signed_off_at else None,
                "signoff_reason": version.signoff_reason,
                "signoff_user_snapshot": version.signoff_user_snapshot,
            },
            style={
                "background": "#1d4ed8" if version.version_id == version_id else "#1e293b",
                "border": f"2px solid {'#22c55e' if version.status == VersionStatus.locked else '#3b82f6'}",
                "color": "#f1f5f9",
            },
        ))

    related_edges = db.query(ReferenceEdge).filter(ReferenceEdge.source_version_id.in_(version_ids)).all()
    feedback_ids = [e.target_id for e in related_edges if e.target_type == TargetType.feedback]
    report_ids = [e.target_id for e in related_edges if e.target_type == TargetType.report]
    feedbacks = {
        f.feedback_id: f
        for f in db.query(Feedback).filter(Feedback.feedback_id.in_(feedback_ids), Feedback.is_deleted == False).all()
    } if feedback_ids else {}
    reports = {
        r.report_id: r
        for r in db.query(Report).filter(Report.report_id.in_(report_ids), Report.is_deleted == False).all()
    } if report_ids else {}

    extra_index = 0
    for edge in related_edges:
        source_id = f"version-{edge.source_version_id}"
        if edge.target_type == TargetType.old_version:
            if edge.target_id not in versions_by_id:
                continue
            target_id = f"version-{edge.target_id}"
            label = "previous version"
            color = "#64748b"
        elif edge.target_type == TargetType.feedback:
            feedback = feedbacks.get(edge.target_id)
            if not feedback:
                continue
            target_id = f"feedback-{feedback.feedback_id}"
            nodes.append(TraceNode(
                id=target_id,
                position={"x": float(extra_index * 220), "y": 160.0},
                data={
                    "label": f"Feedback #{feedback.feedback_id}",
                    "kind": "feedback",
                    "content": feedback.content,
                    "status": feedback.status.value,
                    "author_id": feedback.author_id,
                    "coordinates": feedback.coordinates,
                },
                style={"background": "#14532d", "border": "2px solid #22c55e", "color": "#f1f5f9"},
            ))
            extra_index += 1
            label = "feedback"
            color = "#22c55e"
        else:
            report = reports.get(edge.target_id)
            if not report:
                continue
            target_id = f"report-{report.report_id}"
            nodes.append(TraceNode(
                id=target_id,
                position={"x": float(extra_index * 220), "y": 320.0},
                data={
                    "label": report.name,
                    "kind": "report",
                    "file_url": report.file_url,
                    "report_type": report.report_type,
                    "created_at": report.created_at.isoformat() if report.created_at else None,
                },
                style={"background": "#713f12", "border": "2px solid #facc15", "color": "#f1f5f9"},
            ))
            extra_index += 1
            label = "report"
            color = "#facc15"

        edges.append(TraceEdge(
            id=f"edge-{edge.edge_id}",
            source=source_id,
            target=target_id,
            label=label,
            style={"stroke": color},
        ))

    return TraceabilityOut(nodes=nodes, edges=edges)
