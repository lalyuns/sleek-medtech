from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.product import (
    Component,
    ComponentSourceType,
    Product,
    ProductBOMItem,
    ProductRequest,
    ProductRequestStatus,
    ProductStatus,
)
from app.models.user import User, UserRole
from app.schemas.product import (
    ComponentCreate,
    ComponentOut,
    ProductBOMItemCreate,
    ProductBOMItemOut,
    ProductCreate,
    ProductDetailOut,
    ProductOut,
    ProductRequestCreate,
    ProductRequestOut,
    ProductRequestUpdate,
    ProductUpdate,
    PublicComponentOut,
    PublicProductOut,
)

router = APIRouter(prefix="/api/v1", tags=["products"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user


def _parse_enum(enum_cls, value: str, field_name: str):
    try:
        return enum_cls(value)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid {field_name}: {value}")


def _component_out(component: Component) -> ComponentOut:
    return ComponentOut(
        component_id=component.component_id,
        name=component.name,
        part_number=component.part_number,
        source_type=component.source_type.value,
        unit=component.unit,
        supplier_name=component.supplier_name,
        unit_cost=float(component.unit_cost) if component.unit_cost is not None else None,
        lead_time_days=component.lead_time_days,
        is_critical=component.is_critical,
        requires_certificate=component.requires_certificate,
        created_at=component.created_at,
    )


def _bom_item_out(item: ProductBOMItem, component: Component) -> ProductBOMItemOut:
    return ProductBOMItemOut(
        item_id=item.item_id,
        product_id=item.product_id,
        component_id=item.component_id,
        quantity=float(item.quantity),
        unit=item.unit,
        note=item.note,
        sort_order=item.sort_order,
        component=_component_out(component),
    )


def _product_detail(db: Session, product: Product) -> ProductDetailOut:
    items = (
        db.query(ProductBOMItem, Component)
        .join(Component, ProductBOMItem.component_id == Component.component_id)
        .filter(
            ProductBOMItem.product_id == product.product_id,
            ProductBOMItem.is_deleted == False,
            Component.is_deleted == False,
        )
        .order_by(ProductBOMItem.sort_order, ProductBOMItem.item_id)
        .all()
    )
    return ProductDetailOut(
        product_id=product.product_id,
        name=product.name,
        sku=product.sku,
        description=product.description,
        body_region=product.body_region,
        clinical_use=product.clinical_use,
        surgical_stage=product.surgical_stage,
        indication=product.indication,
        status=product.status.value,
        is_public=product.is_public,
        created_at=product.created_at,
        bom_items=[_bom_item_out(item, component) for item, component in items],
    )


@router.get("/catalog/products", response_model=List[PublicProductOut])
def public_catalog(
    q: str | None = Query(default=None),
    body_region: str | None = Query(default=None),
    clinical_use: str | None = Query(default=None),
    indication: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Product).filter(
        Product.status == ProductStatus.active,
        Product.is_public == True,
        Product.is_deleted == False,
    )
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(
            Product.name.like(pattern),
            Product.sku.like(pattern),
            Product.description.like(pattern),
            Product.body_region.like(pattern),
            Product.clinical_use.like(pattern),
            Product.surgical_stage.like(pattern),
            Product.indication.like(pattern),
        ))
    if body_region:
        query = query.filter(Product.body_region.like(f"%{body_region.strip()}%"))
    if clinical_use:
        query = query.filter(Product.clinical_use.like(f"%{clinical_use.strip()}%"))
    if indication:
        query = query.filter(Product.indication.like(f"%{indication.strip()}%"))
    products = query.order_by(Product.product_id).all()
    output = []
    for product in products:
        detail = _product_detail(db, product)
        output.append(PublicProductOut(
            product_id=detail.product_id,
            name=detail.name,
            sku=detail.sku,
            description=detail.description,
            body_region=detail.body_region,
            clinical_use=detail.clinical_use,
            surgical_stage=detail.surgical_stage,
            indication=detail.indication,
            bom_items=[
                PublicComponentOut(
                    name=item.component.name,
                    source_type=item.component.source_type,
                    quantity=item.quantity,
                    unit=item.unit,
                    is_critical=item.component.is_critical,
                    requires_certificate=item.component.requires_certificate,
                    note=item.note,
                )
                for item in detail.bom_items
            ],
        ))
    return output


@router.post("/catalog/requests", response_model=ProductRequestOut, status_code=status.HTTP_201_CREATED)
def create_public_request(body: ProductRequestCreate, db: Session = Depends(get_db)):
    if body.product_id:
        product = db.query(Product).filter(
            Product.product_id == body.product_id,
            Product.status == ProductStatus.active,
            Product.is_public == True,
            Product.is_deleted == False,
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
    request = ProductRequest(**body.model_dump())
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


@router.get("/products", response_model=List[ProductDetailOut])
def list_products(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    products = db.query(Product).filter(Product.is_deleted == False).order_by(Product.product_id).all()
    return [_product_detail(db, product) for product in products]


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(body: ProductCreate, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    existing = db.query(Product).filter(Product.sku == body.sku, Product.is_deleted == False).first()
    if existing:
        raise HTTPException(status_code=409, detail="SKU already exists")
    product = Product(
        name=body.name,
        sku=body.sku,
        description=body.description,
        body_region=body.body_region,
        clinical_use=body.clinical_use,
        surgical_stage=body.surgical_stage,
        indication=body.indication,
        status=_parse_enum(ProductStatus, body.status, "product status"),
        is_public=body.is_public,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, body: ProductUpdate, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    product = db.query(Product).filter(Product.product_id == product_id, Product.is_deleted == False).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if body.sku and body.sku != product.sku:
        existing = db.query(Product).filter(Product.sku == body.sku, Product.product_id != product_id, Product.is_deleted == False).first()
        if existing:
            raise HTTPException(status_code=409, detail="SKU already exists")
        product.sku = body.sku
    if body.name is not None:
        product.name = body.name
    if body.description is not None:
        product.description = body.description
    if body.body_region is not None:
        product.body_region = body.body_region
    if body.clinical_use is not None:
        product.clinical_use = body.clinical_use
    if body.surgical_stage is not None:
        product.surgical_stage = body.surgical_stage
    if body.indication is not None:
        product.indication = body.indication
    if body.status is not None:
        product.status = _parse_enum(ProductStatus, body.status, "product status")
    if body.is_public is not None:
        product.is_public = body.is_public
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    product = db.query(Product).filter(Product.product_id == product_id, Product.is_deleted == False).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_deleted = True
    product.deleted_at = datetime.utcnow()
    db.commit()


@router.get("/components", response_model=List[ComponentOut])
def list_components(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    components = db.query(Component).filter(Component.is_deleted == False).order_by(Component.component_id).all()
    return [_component_out(component) for component in components]


@router.post("/components", response_model=ComponentOut, status_code=status.HTTP_201_CREATED)
def create_component(body: ComponentCreate, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    component = Component(
        **body.model_dump(exclude={"source_type"}),
        source_type=_parse_enum(ComponentSourceType, body.source_type, "component source type"),
    )
    db.add(component)
    db.commit()
    db.refresh(component)
    return _component_out(component)


@router.post("/products/{product_id}/bom", response_model=ProductBOMItemOut, status_code=status.HTTP_201_CREATED)
def add_bom_item(product_id: int, body: ProductBOMItemCreate, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    product = db.query(Product).filter(Product.product_id == product_id, Product.is_deleted == False).first()
    component = db.query(Component).filter(Component.component_id == body.component_id, Component.is_deleted == False).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    item = ProductBOMItem(product_id=product_id, **body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _bom_item_out(item, component)


@router.delete("/products/{product_id}/bom/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bom_item(product_id: int, item_id: int, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    item = db.query(ProductBOMItem).filter(
        ProductBOMItem.product_id == product_id,
        ProductBOMItem.item_id == item_id,
        ProductBOMItem.is_deleted == False,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="BOM item not found")
    item.is_deleted = True
    item.deleted_at = datetime.utcnow()
    db.commit()


@router.get("/product-requests", response_model=List[ProductRequestOut])
def list_product_requests(db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    return db.query(ProductRequest).filter(ProductRequest.is_deleted == False).order_by(ProductRequest.created_at.desc()).all()


@router.put("/product-requests/{request_id}", response_model=ProductRequestOut)
def update_product_request(request_id: int, body: ProductRequestUpdate, db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    request = db.query(ProductRequest).filter(ProductRequest.request_id == request_id, ProductRequest.is_deleted == False).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    request.status = _parse_enum(ProductRequestStatus, body.status, "request status")
    db.commit()
    db.refresh(request)
    return request
