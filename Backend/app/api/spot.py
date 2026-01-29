from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app import schemas, models
from app.dependencies import get_db, get_current_admin
from app.schemas.response import ResponseModel
from app.core.response import create_response

router = APIRouter(
    prefix="/spots", tags=["Spots"], dependencies=[Depends(get_current_admin)]
)


@router.post(
    "/", response_model=ResponseModel[schemas.Spot], status_code=status.HTTP_201_CREATED
)
def create_spot(
    item: schemas.SpotCreateRequest, db: Annotated[Session, Depends(get_db)]
):
    section = (
        db.query(models.ParkingSection)
        .filter(models.ParkingSection.id == item.section_id)
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Check for unique spot code within the same Parking Area
    existing_spot = (
        db.query(models.Spot)
        .join(models.ParkingSection)
        .filter(
            models.ParkingSection.parking_area_id == section.parking_area_id,
            models.Spot.spot_code == item.spot_code,
        )
        .first()
    )
    if existing_spot:
        raise HTTPException(
            status_code=400,
            detail=f"Spot code '{item.spot_code}' already exists in this Parking Area",
        )

    db_item = models.Spot(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return create_response(
        data=db_item,
        message="Spot created successfully",
        status_code=status.HTTP_201_CREATED,
    )


@router.post(
    "/bulk",
    response_model=ResponseModel[List[schemas.Spot]],
    status_code=status.HTTP_201_CREATED,
)
def create_bulk_spots(
    item: schemas.SpotCreateBulk, db: Annotated[Session, Depends(get_db)]
):
    section = (
        db.query(models.ParkingSection)
        .options(joinedload(models.ParkingSection.parking_area))
        .filter(models.ParkingSection.id == item.section_id)
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    parking_area = section.parking_area

    # 1. Check Total Spots Limit
    current_total_spots = (
        db.query(models.Spot)
        .join(models.ParkingSection)
        .filter(models.ParkingSection.parking_area_id == parking_area.id)
        .count()
    )

    if current_total_spots + len(item.spot_codes) > parking_area.total_spots:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot add {len(item.spot_codes)} spots. Total spots limit ({parking_area.total_spots}) will be exceeded. Current usage: {current_total_spots}.",
        )

    # 2. Check for Duplicates in the Parking Area
    existing_spots = (
        db.query(models.Spot.spot_code)
        .join(models.ParkingSection)
        .filter(
            models.ParkingSection.parking_area_id == parking_area.id,
            models.Spot.spot_code.in_(item.spot_codes),
        )
        .all()
    )

    existing_codes = [s[0] for s in existing_spots]
    if existing_codes:
        raise HTTPException(
            status_code=400,
            detail=f"The following spot codes already exist in this area: {', '.join(existing_codes)}",
        )

    # 3. Create Spots
    new_spots = []
    for code in item.spot_codes:
        new_spot = models.Spot(
            spot_code=code, section_id=item.section_id, status="OFFLINE"
        )
        db.add(new_spot)
        new_spots.append(new_spot)

    try:
        db.commit()
        for spot in new_spots:
            db.refresh(spot)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    return create_response(
        data=new_spots,
        message=f"Successfully created {len(new_spots)} spots",
        status_code=status.HTTP_201_CREATED,
    )


@router.get(
    "/by-section/{section_id}", response_model=ResponseModel[List[schemas.Spot]]
)
def list_spots_by_section(
    section_id: int,
    db: Annotated[Session, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
):
    total_records = (
        db.query(models.Spot).filter(models.Spot.section_id == section_id).count()
    )
    spots = (
        db.query(models.Spot)
        .filter(models.Spot.section_id == section_id)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return create_response(
        data=spots,
        message="Spots fetched successfully",
        meta={
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "limit": limit,
            "total_records": total_records,
            "total_pages": (total_records + limit - 1) // limit if limit > 0 else 1,
        },
    )


@router.put("/{spot_id}", response_model=ResponseModel[schemas.Spot])
def update_spot(
    spot_id: int, item: schemas.SpotUpdate, db: Annotated[Session, Depends(get_db)]
):
    db_item = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Spot not found")

    update_data = item.model_dump(exclude_unset=True)

    # If spot_code is being updated, check for uniqueness in the area
    if "spot_code" in update_data:
        new_code = update_data["spot_code"]
        # Get the section to find the area
        section = (
            db.query(models.ParkingSection)
            .filter(models.ParkingSection.id == db_item.section_id)
            .first()
        )
        if section:
            existing_spot = (
                db.query(models.Spot)
                .join(models.ParkingSection)
                .filter(
                    models.ParkingSection.parking_area_id == section.parking_area_id,
                    models.Spot.spot_code == new_code,
                    models.Spot.id != spot_id,
                )
                .first()
            )
            if existing_spot:
                raise HTTPException(
                    status_code=400,
                    detail=f"Spot code '{new_code}' already exists in this Parking Area",
                )

    for key, value in update_data.items():
        setattr(db_item, key, value)

    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return create_response(data=db_item, message="Spot updated successfully")


@router.post("/{spot_id}/status", response_model=ResponseModel[schemas.Spot])
def update_spot_status(
    spot_id: int,
    status_update: schemas.SpotStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    db_item = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Spot not found")

    db_item.status = status_update.status

    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return create_response(data=db_item, message="Spot status updated successfully")


@router.delete("/{spot_id}", response_model=ResponseModel[None])
def delete_spot(spot_id: int, db: Annotated[Session, Depends(get_db)]):
    db_item = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Spot not found")

    db.delete(db_item)
    db.commit()
    return create_response(data=None, message="Spot deleted successfully")
