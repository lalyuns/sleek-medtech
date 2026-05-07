import hashlib
import io
import json
import math
from datetime import datetime
from pathlib import Path

from passlib.context import CryptContext

from app.database import SessionLocal
from app.models.audit_log import AuditAction, AuditEntityType, AuditLog
from app.models.cost import Cost, CostType
from app.models.feedback import Feedback, FeedbackStatus
from app.models.material import Material
from app.models.model_version import ModelVersion, VersionStatus
from app.models.project import Project, ProjectStatus
from app.models.reference_edge import ReferenceEdge, TargetType
from app.models.report import Report
from app.models.user import User, UserRole
from app.models.user_project_mapping import AccessLevel, UserProjectMapping
from app.storage import BUCKET, ensure_bucket, minio_client


pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def normal(a, b, c):
    ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
    vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
    nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
    length = math.sqrt(nx * nx + ny * ny + nz * nz) or 1
    return nx / length, ny / length, nz / length


def add_tri(lines, a, b, c):
    n = normal(a, b, c)
    lines.extend([
        f"  facet normal {n[0]:.6f} {n[1]:.6f} {n[2]:.6f}",
        "    outer loop",
        f"      vertex {a[0]:.6f} {a[1]:.6f} {a[2]:.6f}",
        f"      vertex {b[0]:.6f} {b[1]:.6f} {b[2]:.6f}",
        f"      vertex {c[0]:.6f} {c[1]:.6f} {c[2]:.6f}",
        "    endloop",
        "  endfacet",
    ])


def add_box(lines, start, end, width, height):
    sx, sy = start
    ex, ey = end
    dx, dy = ex - sx, ey - sy
    length = math.sqrt(dx * dx + dy * dy) or 1
    ux, uy = dx / length, dy / length
    px, py = -uy * width / 2, ux * width / 2
    z0, z1 = -height / 2, height / 2

    p = [
        (sx + px, sy + py, z0),
        (sx - px, sy - py, z0),
        (ex - px, ey - py, z0),
        (ex + px, ey + py, z0),
        (sx + px, sy + py, z1),
        (sx - px, sy - py, z1),
        (ex - px, ey - py, z1),
        (ex + px, ey + py, z1),
    ]
    for a, b, c in [
        (0, 1, 2), (0, 2, 3), (4, 7, 6), (4, 6, 5),
        (0, 4, 5), (0, 5, 1), (1, 5, 6), (1, 6, 2),
        (2, 6, 7), (2, 7, 3), (3, 7, 4), (3, 4, 0),
    ]:
        add_tri(lines, p[a], p[b], p[c])


def add_annular_cylinder(lines, center, outer_radius, inner_radius, height, segments=48):
    cx, cy = center
    z0, z1 = -height / 2, height / 2
    for index in range(segments):
        a0 = 2 * math.pi * index / segments
        a1 = 2 * math.pi * (index + 1) / segments
        outer0 = (cx + math.cos(a0) * outer_radius, cy + math.sin(a0) * outer_radius)
        outer1 = (cx + math.cos(a1) * outer_radius, cy + math.sin(a1) * outer_radius)
        inner0 = (cx + math.cos(a0) * inner_radius, cy + math.sin(a0) * inner_radius)
        inner1 = (cx + math.cos(a1) * inner_radius, cy + math.sin(a1) * inner_radius)

        ot0, ot1 = (*outer0, z1), (*outer1, z1)
        it0, it1 = (*inner0, z1), (*inner1, z1)
        ob0, ob1 = (*outer0, z0), (*outer1, z0)
        ib0, ib1 = (*inner0, z0), (*inner1, z0)

        add_tri(lines, ot0, ot1, it1)
        add_tri(lines, ot0, it1, it0)
        add_tri(lines, ob0, ib1, ob1)
        add_tri(lines, ob0, ib0, ib1)
        add_tri(lines, ob0, ob1, ot1)
        add_tri(lines, ob0, ot1, ot0)
        add_tri(lines, ib0, it1, ib1)
        add_tri(lines, ib0, it0, it1)


def implant_plate_stl(name, hole_count=7, curve=7.5, length=58, beam_width=5.4, thickness=1.6):
    centers = []
    for index in range(hole_count):
        t = index / (hole_count - 1)
        x = -length / 2 + t * length
        y = math.sin((t - 0.5) * math.pi) * curve
        centers.append((x, y))

    lines = [f"solid {name}"]
    for a, b in zip(centers, centers[1:]):
        add_box(lines, a, b, beam_width, thickness)
    for center in centers:
        add_annular_cylinder(lines, center, outer_radius=3.6, inner_radius=1.35, height=thickness, segments=44)

    add_box(lines, (centers[0][0] - 6, centers[0][1] - 1.8), centers[0], 3.6, thickness)
    add_box(lines, centers[-1], (centers[-1][0] + 6, centers[-1][1] + 1.8), 3.6, thickness)
    lines.append(f"endsolid {name}")
    return "\n".join(lines) + "\n"


def cranial_mesh_stl(name):
    lines = [f"solid {name}"]
    a, b = 31.0, 21.0
    for y in [value * 4 for value in range(-5, 6)]:
        if abs(y) >= b:
            continue
        half_x = a * math.sqrt(max(0, 1 - (y * y) / (b * b)))
        add_box(lines, (-half_x, y), (half_x, y), 1.05, 0.95)
    for x in [value * 4 for value in range(-7, 8)]:
        if abs(x) >= a:
            continue
        half_y = b * math.sqrt(max(0, 1 - (x * x) / (a * a)))
        add_box(lines, (x, -half_y), (x, half_y), 1.05, 0.95)

    perimeter = []
    for index in range(64):
        angle = 2 * math.pi * index / 64
        perimeter.append((math.cos(angle) * a, math.sin(angle) * b))
    for start, end in zip(perimeter, perimeter[1:] + perimeter[:1]):
        add_box(lines, start, end, 1.7, 1.1)

    lines.append(f"endsolid {name}")
    return "\n".join(lines) + "\n"


def write_demo_asset(relative_name, content):
    repo_root = Path(__file__).resolve().parents[1]
    demo_dir = repo_root / "frontend" / "public" / "demo"
    demo_dir.mkdir(parents=True, exist_ok=True)
    path = demo_dir / relative_name
    path.write_text(content, encoding="utf-8")
    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
    return f"/demo/{relative_name}?v={digest[:10]}", digest


def upload_demo_object(object_name, content, content_type):
    try:
        ensure_bucket()
        data = content.encode("utf-8")
        minio_client.put_object(BUCKET, f"demo/{object_name}", io.BytesIO(data), length=len(data), content_type=content_type)
        policy = {
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{BUCKET}/demo/*"],
            }],
        }
        minio_client.set_bucket_policy(BUCKET, json.dumps(policy))
    except Exception as exc:
        print(f"MinIO demo upload skipped: {exc}")


def get_user(db, email, name, role, password):
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.name = name
        user.role = role
        user.is_deleted = False
        return user
    user = User(name=name, email=email, hashed_password=pwd.hash(password), role=role)
    db.add(user)
    db.flush()
    return user


def get_material(db, name, parameters):
    material = db.query(Material).filter(Material.name == name).first()
    if material:
        material.physical_parameters = parameters
        material.is_active = True
        material.is_deleted = False
        return material
    material = Material(name=name, physical_parameters=parameters, is_active=True)
    db.add(material)
    db.flush()
    return material


def get_project(db, code, fallback_name, description, owner_id):
    project = db.query(Project).filter(Project.name.like(f"%{code}%")).first()
    if project:
        project.description = description
        project.status = ProjectStatus.active
        project.is_deleted = False
        return project
    project = Project(name=fallback_name, description=description, owner_id=owner_id, status=ProjectStatus.active)
    db.add(project)
    db.flush()
    return project


def upsert_mapping(db, user_id, project_id, access_level):
    mapping = db.query(UserProjectMapping).filter(
        UserProjectMapping.user_id == user_id,
        UserProjectMapping.project_id == project_id,
    ).first()
    if mapping:
        mapping.access_level = access_level
    else:
        db.add(UserProjectMapping(user_id=user_id, project_id=project_id, access_level=access_level))


def get_version(db, project_id, uploader_id, material_id, number, description, volume, file_url, hash_value, status):
    version = db.query(ModelVersion).filter(
        ModelVersion.project_id == project_id,
        ModelVersion.version_number == number,
    ).first()
    if version:
        version.uploader_id = uploader_id
        version.material_id = material_id
        version.description = description
        version.volume = volume
        version.file_url = file_url
        version.hash_value = hash_value
        version.status = status
        version.total_chunks = 1
        version.is_deleted = False
        return version
    version = ModelVersion(
        project_id=project_id,
        uploader_id=uploader_id,
        material_id=material_id,
        version_number=number,
        description=description,
        volume=volume,
        file_url=file_url,
        hash_value=hash_value,
        status=status,
        total_chunks=1,
    )
    db.add(version)
    db.flush()
    return version


def upsert_edge(db, source_version_id, target_type, target_id):
    edge = db.query(ReferenceEdge).filter(
        ReferenceEdge.source_version_id == source_version_id,
        ReferenceEdge.target_type == target_type,
        ReferenceEdge.target_id == target_id,
    ).first()
    if not edge:
        db.add(ReferenceEdge(source_version_id=source_version_id, target_type=target_type, target_id=target_id))


def get_feedback(db, version_id, author_id, content, coordinates, converted=False):
    feedback = db.query(Feedback).filter(Feedback.target_version_id == version_id, Feedback.content == content).first()
    if feedback:
        feedback.coordinates = coordinates
        feedback.author_id = author_id
        feedback.status = FeedbackStatus.converted if converted else FeedbackStatus.submitted
        feedback.is_deleted = False
        return feedback
    feedback = Feedback(
        target_version_id=version_id,
        author_id=author_id,
        content=content,
        coordinates=coordinates,
        status=FeedbackStatus.converted if converted else FeedbackStatus.submitted,
    )
    db.add(feedback)
    db.flush()
    return feedback


def get_report(db, project_id, uploader_id, name, report_type, file_url):
    report = db.query(Report).filter(Report.project_id == project_id, Report.name == name).first()
    if report:
        report.uploader_id = uploader_id
        report.report_type = report_type
        report.file_url = file_url
        report.is_deleted = False
        return report
    report = Report(project_id=project_id, uploader_id=uploader_id, name=name, report_type=report_type, file_url=file_url)
    db.add(report)
    db.flush()
    return report


def get_cost(db, project_id, cost_type, amount, description):
    cost = db.query(Cost).filter(Cost.project_id == project_id, Cost.type == cost_type, Cost.description == description).first()
    if cost:
        cost.amount = amount
        cost.is_deleted = False
        return cost
    cost = Cost(project_id=project_id, type=cost_type, amount=amount, description=description)
    db.add(cost)
    db.flush()
    return cost


def get_audit(db, user_id, action, entity_type, entity_id, request_id, new_values):
    log = db.query(AuditLog).filter(AuditLog.request_id == request_id).first()
    if log:
        log.new_values = new_values
        return
    db.add(AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        request_id=request_id,
        ip_address="127.0.0.1",
        user_agent="scenario-seed",
        new_values=new_values,
    ))


def main():
    plate_v1_content = implant_plate_stl("mandibular_plate_v1", hole_count=6, curve=6.5, length=52)
    plate_v2_content = implant_plate_stl("mandibular_plate_v2", hole_count=7, curve=8.0, length=60)
    mesh_v1_content = cranial_mesh_stl("cranial_mesh_v1")

    mandible_v1, hash_v1 = write_demo_asset("mandibular_plate_v1.stl", plate_v1_content)
    mandible_v2, hash_v2 = write_demo_asset("mandibular_plate_v2.stl", plate_v2_content)
    cranial_v1, hash_cranial = write_demo_asset("cranial_mesh_v1.stl", mesh_v1_content)

    report_material_url, _ = write_demo_asset(
        "ti64_material_certificate.txt",
        "Ti-6Al-4V ELI material certificate\nLot: TI64-2026-041\nDensity: 4.43 g/cm3\nTensile strength: 895 MPa\n",
    )
    report_bio_url, _ = write_demo_asset(
        "biocompatibility_summary.txt",
        "Biocompatibility summary for patient-specific mandibular reconstruction plate.\nISO 10993 evidence package: pass.\n",
    )
    report_sterile_url, _ = write_demo_asset(
        "sterilization_validation.txt",
        "Sterilization validation record.\nCycle: steam 134C, 18 min.\nResult: pass.\n",
    )

    upload_demo_object("mandibular_plate_v1.stl", plate_v1_content, "model/stl")
    upload_demo_object("mandibular_plate_v2.stl", plate_v2_content, "model/stl")
    upload_demo_object("cranial_mesh_v1.stl", mesh_v1_content, "model/stl")

    db = SessionLocal()
    try:
        admin = get_user(db, "admin@sleek.com", "System Admin", UserRole.admin, "admin1234")
        engineer = get_user(db, "engineer.chen@sleek.com", "Chen R&D Engineer", UserRole.engineer, "engineer1234")
        doctor = get_user(db, "doctor.lin@hospital.example", "Dr. Lin", UserRole.doctor, "doctor1234")
        vendor = get_user(db, "vendor.wu@supplier.example", "Wu Manufacturing Vendor", UserRole.vendor, "vendor1234")

        ti64 = get_material(db, "Titanium Ti-6Al-4V ELI", {
            "density": 4.43,
            "unit_price": 450,
            "unit_price_unit": "per_g",
            "tensile_strength": 895,
            "elastic_modulus": 113800,
            "sterilization": "steam/autoclave",
            "standard": "ASTM F136",
        })
        steel = get_material(db, "Medical stainless steel 316L", {
            "density": 7.99,
            "unit_price": 180,
            "unit_price_unit": "per_g",
            "tensile_strength": 515,
            "elastic_modulus": 193000,
            "standard": "ASTM F138",
        })
        get_material(db, "Medical grade PEEK", {
            "density": 1.32,
            "unit_price": 260,
            "unit_price_unit": "per_g",
            "tensile_strength": 100,
            "elastic_modulus": 3600,
            "standard": "ASTM F2026",
        })

        mandible = get_project(
            db,
            "MR-2026-041",
            "Mandibular reconstruction plate MR-2026-041",
            "Patient-specific mandibular reconstruction plate with STL versions, clinical feedback, material evidence, and BOM costs.",
            admin.user_id,
        )
        cranial = get_project(
            db,
            "CM-2026-017",
            "Cranial repair mesh CM-2026-017",
            "Cranial repair mesh used to validate multi-project review, read-only vendor access, and report archiving.",
            admin.user_id,
        )

        for project in (mandible, cranial):
            upsert_mapping(db, admin.user_id, project.project_id, AccessLevel.admin)
            upsert_mapping(db, engineer.user_id, project.project_id, AccessLevel.edit)
            upsert_mapping(db, doctor.user_id, project.project_id, AccessLevel.read_only)
            upsert_mapping(db, vendor.user_id, project.project_id, AccessLevel.read_only)

        mandible_v1_row = get_version(db, mandible.project_id, engineer.user_id, ti64.material_id, 1, "Initial six-hole mandibular plate contour from CT planning.", 520.0, mandible_v1, hash_v1, VersionStatus.locked)
        mandible_v2_row = get_version(db, mandible.project_id, engineer.user_id, ti64.material_id, 2, "Seven-hole curved plate with reduced posterior edge thickness and wider screw clearance.", 610.0, mandible_v2, hash_v2, VersionStatus.draft)
        cranial_v1_row = get_version(db, cranial.project_id, engineer.user_id, steel.material_id, 1, "Oval cranial mesh lattice for manufacturing quote and sterilization evidence.", 840.0, cranial_v1, hash_cranial, VersionStatus.locked)
        for version, reason in [
            (mandible_v1_row, "Clinical review accepted initial contour before v2 refinement."),
            (cranial_v1_row, "Cranial mesh fit accepted for manufacturing quote package."),
        ]:
            version.signed_off_by = doctor.user_id
            version.signed_off_at = version.signed_off_at or datetime.utcnow()
            version.signoff_reason = reason
            version.signoff_user_snapshot = {
                "user_id": doctor.user_id,
                "name": doctor.name,
                "email": doctor.email,
                "role": doctor.role.value,
            }

        fb_edge = get_feedback(db, mandible_v1_row.version_id, doctor.user_id, "Posterior edge is too close to the nerve canal; please reduce thickness by 1 mm.", {"x": 22.0, "y": -5.0, "z": 0.9}, converted=True)
        fb_screw = get_feedback(db, mandible_v2_row.version_id, doctor.user_id, "Screw hole clearance looks acceptable; keep this as the sign-off candidate.", {"x": 12.0, "y": 2.0, "z": 0.8})

        material_report = get_report(db, mandible.project_id, vendor.user_id, "TI64 lot TI64-2026-041 material certificate", "material_test", report_material_url)
        bio_report = get_report(db, mandible.project_id, engineer.user_id, "ISO 10993 biocompatibility summary", "compliance", report_bio_url)
        sterile_report = get_report(db, cranial.project_id, engineer.user_id, "Steam sterilization validation record", "sterilization", report_sterile_url)

        upsert_edge(db, mandible_v2_row.version_id, TargetType.old_version, mandible_v1_row.version_id)
        upsert_edge(db, mandible_v2_row.version_id, TargetType.feedback, fb_edge.feedback_id)
        upsert_edge(db, mandible_v2_row.version_id, TargetType.feedback, fb_screw.feedback_id)
        upsert_edge(db, mandible_v2_row.version_id, TargetType.report, material_report.report_id)
        upsert_edge(db, mandible_v2_row.version_id, TargetType.report, bio_report.report_id)
        upsert_edge(db, cranial_v1_row.version_id, TargetType.report, sterile_report.report_id)

        get_cost(db, mandible.project_id, CostType.labor, 4200, "R&D contour adjustment and DFM review")
        get_cost(db, mandible.project_id, CostType.external_sample, 12800, "Vendor titanium sample print and post-processing")
        get_cost(db, cranial.project_id, CostType.labor, 2600, "Mesh fitting review")
        get_cost(db, cranial.project_id, CostType.external_sample, 7600, "316L prototype quotation sample")

        get_audit(db, engineer.user_id, AuditAction.upload, AuditEntityType.model_version, mandible_v1_row.version_id, "scenario-upload-mr-v1", {"project": mandible.name, "version": 1})
        get_audit(db, doctor.user_id, AuditAction.sign_off, AuditEntityType.model_version, mandible_v1_row.version_id, "scenario-signoff-mr-v1", {"status": "locked"})
        get_audit(db, engineer.user_id, AuditAction.upload, AuditEntityType.model_version, mandible_v2_row.version_id, "scenario-upload-mr-v2", {"project": mandible.name, "version": 2})
        get_audit(db, vendor.user_id, AuditAction.create, AuditEntityType.report, material_report.report_id, "scenario-report-ti64", {"report_type": material_report.report_type})
        get_audit(db, engineer.user_id, AuditAction.create, AuditEntityType.cost, mandible.project_id, "scenario-cost-mr", {"total_manual_costs": 17000})

        db.commit()
        print("Scenario seed complete.")
        print("Accounts:")
        print("  admin@sleek.com / admin1234")
        print("  engineer.chen@sleek.com / engineer1234")
        print("  doctor.lin@hospital.example / doctor1234")
        print("  vendor.wu@supplier.example / vendor1234")
        print(f"Projects updated: {mandible.name}, {cranial.name}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
