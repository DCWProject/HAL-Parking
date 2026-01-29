from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import schemas, models
from app.dependencies import get_db, get_current_admin
from app.schemas.response import ResponseModel
from app.core.response import create_response, error_response

router = APIRouter(
    prefix="/sections", tags=["Sections"], dependencies=[Depends(get_current_admin)]
)


@router.post(
    "/",
    response_model=ResponseModel[schemas.ParkingSection],
    status_code=status.HTTP_201_CREATED,
)
def create_section(
    item: schemas.ParkingSectionCreate, db: Annotated[Session, Depends(get_db)]
):
    # Verify parking area exists
    area = (
        db.query(models.ParkingArea)
        .filter(models.ParkingArea.id == item.parking_area_id)
        .first()
    )
    if not area:
        raise HTTPException(status_code=404, detail="Parking Area not found")

    # Validate duplicates (Name or Section Code) within the same Parking Area
    errors = {}

    existing_name = (
        db.query(models.ParkingSection)
        .filter(
            models.ParkingSection.parking_area_id == item.parking_area_id,
            models.ParkingSection.name == item.name,
        )
        .first()
    )
    if existing_name:
        errors["name"] = ["Section with this name already exists in this area."]

    if item.section_code:
        existing_code = (
            db.query(models.ParkingSection)
            .filter(
                models.ParkingSection.parking_area_id == item.parking_area_id,
                models.ParkingSection.section_code == item.section_code,
            )
            .first()
        )
        if existing_code:
            errors["section_code"] = [
                "Section with this code already exists in this area."
            ]

    # Validate total sections limit
    current_count = (
        db.query(models.ParkingSection)
        .filter(models.ParkingSection.parking_area_id == item.parking_area_id)
        .count()
    )
    if current_count >= area.total_sections:
        errors["non_field_errors"] = [
            f"Cannot create section. Maximum limit of {area.total_sections} sections reached."
        ]

    if errors:
        return error_response(
            message="Validation failed",
            status_code=400,
            errors=errors,
        )

    db_item = models.ParkingSection(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return create_response(
        data=db_item,
        message="Section created successfully",
        status_code=status.HTTP_201_CREATED,
    )


@router.get(
    "/by-area/{area_id}", response_model=ResponseModel[List[schemas.ParkingSection]]
)
def list_sections_by_area(
    area_id: int,
    db: Annotated[Session, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
):
    total_records = (
        db.query(models.ParkingSection)
        .filter(models.ParkingSection.parking_area_id == area_id)
        .count()
    )
    sections = (
        db.query(models.ParkingSection)
        .filter(models.ParkingSection.parking_area_id == area_id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return create_response(
        data=sections,
        message="Sections fetched successfully",
        meta={
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "limit": limit,
            "total_records": total_records,
            "total_pages": (total_records + limit - 1) // limit if limit > 0 else 1,
        },
    )


@router.put("/{section_id}", response_model=ResponseModel[schemas.ParkingSection])
def update_section(
    section_id: int,
    item: schemas.ParkingSectionUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    db_item = (
        db.query(models.ParkingSection)
        .filter(models.ParkingSection.id == section_id)
        .first()
    )
    if not db_item:
        raise HTTPException(status_code=404, detail="Section not found")

    # Validate duplicates (Name or Section Code) within the same Parking Area (excluding current section)
    errors = {}

    # Check Name
    if item.name and item.name != db_item.name:
        existing_name = (
            db.query(models.ParkingSection)
            .filter(
                models.ParkingSection.parking_area_id == db_item.parking_area_id,
                models.ParkingSection.name == item.name,
                models.ParkingSection.id != section_id,
            )
            .first()
        )
        if existing_name:
            errors["name"] = ["Section with this name already exists in this area."]

    # Check Section Code
    if item.section_code is not None and item.section_code != db_item.section_code:
        if item.section_code:
            existing_code = (
                db.query(models.ParkingSection)
                .filter(
                    models.ParkingSection.parking_area_id == db_item.parking_area_id,
                    models.ParkingSection.section_code == item.section_code,
                    models.ParkingSection.id != section_id,
                )
                .first()
            )
            if existing_code:
                errors["section_code"] = [
                    "Section with this code already exists in this area."
                ]

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
    return create_response(data=db_item, message="Section updated successfully")


@router.delete("/{section_id}", response_model=ResponseModel[None])
def delete_section(section_id: int, db: Annotated[Session, Depends(get_db)]):
    db_item = (
        db.query(models.ParkingSection)
        .filter(models.ParkingSection.id == section_id)
        .first()
    )
    if not db_item:
        raise HTTPException(status_code=404, detail="Section not found")

    db.delete(db_item)
    db.commit()
    return create_response(data=None, message="Section deleted successfully")
