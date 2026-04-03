from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app import schemas, models
from app.dependencies import get_db, get_current_admin
from app.schemas.response import ResponseModel
from app.core.response import create_response, error_response

router = APIRouter(
    prefix="/parking-areas",
    tags=["Parking Areas"],
    dependencies=[Depends(get_current_admin)],
)


@router.post(
    "/",
    response_model=ResponseModel[schemas.ParkingArea],
    status_code=status.HTTP_201_CREATED,
)
def create_parking_area(
    item: schemas.ParkingAreaCreate, db: Annotated[Session, Depends(get_db)]
):
    # Check for duplicates (Name or Area Code)
    errors = {}

    existing_name = (
        db.query(models.ParkingArea)
        .filter(models.ParkingArea.name == item.name)
        .first()
    )
    if existing_name:
        errors["name"] = [
            "A parking area with this name already exists. Please choose a different name."
        ]

    existing_code = (
        db.query(models.ParkingArea)
        .filter(models.ParkingArea.area_code == item.area_code)
        .first()
    )
    if existing_code:
        errors["area_code"] = [
            "A parking area with this code already exists. Please choose a unique code."
        ]

    if errors:
        return error_response(
            message="Validation failed",
            status_code=400,
            errors=errors,
        )

    db_item = models.ParkingArea(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return create_response(
        data=db_item,
        message="Parking area created successfully",
        status_code=status.HTTP_201_CREATED,
    )


@router.get("/", response_model=ResponseModel[List[schemas.ParkingArea]])
def list_parking_areas(
    db: Annotated[Session, Depends(get_db)], skip: int = 0, limit: int = 100
):
    total_records = db.query(models.ParkingArea).count()
    areas = db.query(models.ParkingArea).offset(skip).limit(limit).all()

    return create_response(
        data=areas,
        message="Parking areas fetched successfully",
        meta={
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "limit": limit,
            "total_records": total_records,
            "total_pages": (total_records + limit - 1) // limit if limit > 0 else 1,
        },
    )


@router.get(
    "/list/minimal", response_model=ResponseModel[List[schemas.ParkingAreaMinimal]]
)
def list_parking_areas_minimal(
    db: Annotated[Session, Depends(get_db)],
):
    areas = (
        db.query(models.ParkingArea)
        .with_entities(models.ParkingArea.id, models.ParkingArea.name)
        .all()
    )
    # SQLAlchemy .with_entities returns tuples/KeyedTuples, Pydantic needs dicts or objects.
    # We must convert to list of dicts or proper schema objects
    data = [{"id": a.id, "name": a.name} for a in areas]

    return create_response(
        data=data, message="Minimal parking area list fetched successfully"
    )


@router.get("/{area_id}", response_model=ResponseModel[schemas.ParkingAreaDetail])
def get_parking_area(
    area_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    # Load all data with eager loading
    db_item = (
        db.query(models.ParkingArea)
        .options(
            joinedload(models.ParkingArea.sections).joinedload(
                models.ParkingSection.spots
            ),
            joinedload(models.ParkingArea.devices),
        )
        .filter(models.ParkingArea.id == area_id)
        .first()
    )

    if not db_item:
        raise HTTPException(status_code=404, detail="Parking Area not found")

    # Sort sections and spots in Python after loading
    if db_item.sections:
        db_item.sections.sort(key=lambda s: s.name or "")
        for section in db_item.sections:
            if section.spots:
                section.spots.sort(key=lambda sp: sp.spot_code or "")

    return create_response(data=db_item, message="Parking area fetched successfully")


@router.put("/{area_id}", response_model=ResponseModel[schemas.ParkingArea])
def update_parking_area(
    area_id: int,
    item: schemas.ParkingAreaUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    db_item = (
        db.query(models.ParkingArea)
        .options(
            joinedload(models.ParkingArea.sections).joinedload(
                models.ParkingSection.spots
            ),
        )
        .filter(models.ParkingArea.id == area_id)
        .first()
    )
    if not db_item:
        raise HTTPException(status_code=404, detail="Parking Area not found")

    errors = {}

    # Validate Duplicate Name or Area Code (excluding current)
    if item.name and item.name != db_item.name:
        existing_name = (
            db.query(models.ParkingArea)
            .filter(
                models.ParkingArea.name == item.name, models.ParkingArea.id != area_id
            )
            .first()
        )
        if existing_name:
            errors["name"] = ["A parking area with this name already exists."]

    if item.area_code and item.area_code != db_item.area_code:
        existing_code = (
            db.query(models.ParkingArea)
            .filter(
                models.ParkingArea.area_code == item.area_code,
                models.ParkingArea.id != area_id,
            )
            .first()
        )
        if existing_code:
            errors["area_code"] = ["A parking area with this code already exists."]

    # Validate Total Sections
    if item.total_sections is not None:
        current_section_count = len(db_item.sections)
        if item.total_sections < current_section_count:
            diff = current_section_count - item.total_sections
            errors["total_sections"] = [
                f"Cannot reduce total sections to {item.total_sections}. You have {current_section_count} existing sections. Please remove {diff} section(s) first."
            ]

    # Validate Total Spots
    if item.total_spots is not None:
        # Calculate total EXISTING spots across all sections
        current_spot_count = sum(len(section.spots) for section in db_item.sections)
        if item.total_spots < current_spot_count:
            diff = current_spot_count - item.total_spots
            errors["total_spots"] = [
                f"Cannot reduce total spots to {item.total_spots}. You have {current_spot_count} existing spots. Please remove {diff} spot(s) first."
            ]
        elif item.total_spots < 4:
            errors["total_spots"] = ["Total spots must be at least 4."]

    if errors:
        return error_response(
            message="Validation failed",
            status_code=400,
            errors=errors,
        )

    update_data = item.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)

    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return create_response(data=db_item, message="Parking area updated successfully")


@router.delete("/{area_id}", response_model=ResponseModel[None])
def delete_parking_area(
    area_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    db_item = (
        db.query(models.ParkingArea).filter(models.ParkingArea.id == area_id).first()
    )
    if not db_item:
        raise HTTPException(status_code=404, detail="Parking Area not found")

    db.delete(db_item)
    db.commit()
    return create_response(data=None, message="Parking area deleted successfully")
