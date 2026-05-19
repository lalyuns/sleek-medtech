from app.database import SessionLocal
from app.models.product import Component, ComponentSourceType, Product, ProductBOMItem, ProductStatus
from app.models.project import Project


def upsert_component(db, name, part_number, source_type, unit, supplier_name=None, unit_cost=None, lead_time_days=None, is_critical=False, requires_certificate=False):
    component = db.query(Component).filter(Component.part_number == part_number, Component.is_deleted == False).first()
    if not component:
        component = Component(name=name, part_number=part_number, source_type=source_type, unit=unit)
        db.add(component)
        db.flush()
    component.name = name
    component.source_type = source_type
    component.unit = unit
    component.supplier_name = supplier_name
    component.unit_cost = unit_cost
    component.lead_time_days = lead_time_days
    component.is_critical = is_critical
    component.requires_certificate = requires_certificate
    component.is_deleted = False
    return component


def upsert_product(db, name, sku, description, body_region=None, clinical_use=None, surgical_stage=None, indication=None, is_public=True):
    product = db.query(Product).filter(Product.sku == sku, Product.is_deleted == False).first()
    if not product:
        product = Product(name=name, sku=sku, description=description)
        db.add(product)
        db.flush()
    product.name = name
    product.description = description
    product.body_region = body_region
    product.clinical_use = clinical_use
    product.surgical_stage = surgical_stage
    product.indication = indication
    product.status = ProductStatus.active
    product.is_public = is_public
    product.is_deleted = False
    return product


def upsert_bom_item(db, product, component, quantity, unit="pcs", note=None, sort_order=0):
    item = db.query(ProductBOMItem).filter(
        ProductBOMItem.product_id == product.product_id,
        ProductBOMItem.component_id == component.component_id,
        ProductBOMItem.is_deleted == False,
    ).first()
    if not item:
        item = ProductBOMItem(
            product_id=product.product_id,
            component_id=component.component_id,
            quantity=quantity,
            unit=unit,
            note=note,
            sort_order=sort_order,
        )
        db.add(item)
        db.flush()
    item.quantity = quantity
    item.unit = unit
    item.note = note
    item.sort_order = sort_order
    item.is_deleted = False
    return item


def seed_product_catalog():
    db = SessionLocal()
    try:
        plate = upsert_component(
            db,
            "客製下顎固定板主體",
            "SM-MR-PLATE",
            ComponentSourceType.self_made,
            "pcs",
            unit_cost=14850,
            lead_time_days=5,
            is_critical=True,
            requires_certificate=True,
        )
        screw = upsert_component(
            db,
            "鈦合金骨釘 2.0mm",
            "BUY-TI-SCREW-20",
            ComponentSourceType.purchased,
            "pcs",
            supplier_name="外部醫材供應商",
            unit_cost=420,
            lead_time_days=7,
            is_critical=True,
            requires_certificate=True,
        )
        guide = upsert_component(
            db,
            "定位導板",
            "SM-CUT-GUIDE",
            ComponentSourceType.self_made,
            "pcs",
            unit_cost=3600,
            lead_time_days=3,
            is_critical=False,
            requires_certificate=False,
        )
        sterile_pack = upsert_component(
            db,
            "滅菌包材與標籤",
            "BUY-STERILE-PACK",
            ComponentSourceType.purchased,
            "set",
            supplier_name="包材供應商",
            unit_cost=280,
            lead_time_days=4,
            requires_certificate=True,
        )
        surface_finish = upsert_component(
            db,
            "表面處理與清洗",
            "OUT-SURFACE-FINISH",
            ComponentSourceType.outsourced,
            "lot",
            supplier_name="委外後處理廠",
            unit_cost=1800,
            lead_time_days=6,
            is_critical=True,
            requires_certificate=True,
        )

        mandible_set = upsert_product(
            db,
            "下顎重建固定板套組",
            "KIT-MR-2026",
            "含客製主固定板、骨釘、定位導板、滅菌包材與可追溯文件的套組。",
            body_region="口腔顎面 / 下顎骨",
            clinical_use="下顎骨缺損重建與固定",
            surgical_stage="術中固定、術後支撐",
            indication="腫瘤切除、創傷或先天缺損後的下顎骨重建情境。",
        )
        upsert_bom_item(db, mandible_set, plate, 1, "pcs", "由 STL 版本與醫師簽核建立。", 10)
        upsert_bom_item(db, mandible_set, screw, 6, "pcs", "依手術規劃可調整數量，外購批號需追溯。", 20)
        upsert_bom_item(db, mandible_set, guide, 1, "pcs", "用於術前定位與溝通。", 30)
        upsert_bom_item(db, mandible_set, sterile_pack, 1, "set", "交付前需確認包材與標籤。", 40)
        upsert_bom_item(db, mandible_set, surface_finish, 1, "lot", "委外製程需回傳處理紀錄。", 50)

        mesh = upsert_component(
            db,
            "顱骨修補網片主體",
            "SM-CM-MESH",
            ComponentSourceType.self_made,
            "pcs",
            unit_cost=9600,
            lead_time_days=4,
            is_critical=True,
            requires_certificate=True,
        )
        screw_small = upsert_component(
            db,
            "微型固定螺釘",
            "BUY-MINI-SCREW",
            ComponentSourceType.purchased,
            "pcs",
            supplier_name="外部醫材供應商",
            unit_cost=260,
            lead_time_days=7,
            is_critical=True,
            requires_certificate=True,
        )
        cranial_set = upsert_product(
            db,
            "顱骨修補網片套組",
            "KIT-CM-2026",
            "含修補網片、微型固定螺釘與交付文件的標準追溯套組。",
            body_region="顱顏 / 顱骨缺損區",
            clinical_use="顱骨缺損覆蓋與修補",
            surgical_stage="術中覆蓋固定、術後保護",
            indication="外傷或術後顱骨缺損，需要客製化鈦網貼合與固定的情境。",
        )
        upsert_bom_item(db, cranial_set, mesh, 1, "pcs", "依版本模型製作。", 10)
        upsert_bom_item(db, cranial_set, screw_small, 8, "pcs", "外購，可依醫師需求調整數量。", 20)
        upsert_bom_item(db, cranial_set, sterile_pack, 1, "set", "交付前需確認包材與標籤。", 30)

        link_demo_projects_to_products(db)

        db.commit()
        print("Product catalog seed complete.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def link_demo_projects_to_products(db):
    mandible_set = db.query(Product).filter(Product.sku == "KIT-MR-2026", Product.is_deleted == False).first()
    cranial_set = db.query(Product).filter(Product.sku == "KIT-CM-2026", Product.is_deleted == False).first()
    if mandible_set:
        for project in db.query(Project).filter(Project.name.like("%MR-2026-041%"), Project.is_deleted == False).all():
            project.product_id = mandible_set.product_id
    if cranial_set:
        for project in db.query(Project).filter(Project.name.like("%CM-2026-017%"), Project.is_deleted == False).all():
            project.product_id = cranial_set.product_id


if __name__ == "__main__":
    seed_product_catalog()
