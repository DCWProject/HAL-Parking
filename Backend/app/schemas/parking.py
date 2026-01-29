from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.schemas.device import DeviceResponse


# Spot
class SpotBase(BaseModel):
    spot_code: str
    status: str = "OFFLINE"  # "OFFLINE", "AVAILABLE", "OCCUPIED"


class SpotCreate(SpotBase):
    pass
    # section_id is usually passed in the URL or implied


class SpotCreateRequest(SpotBase):
    section_id: int
    pass


class SpotCreateBulk(BaseModel):
    section_id: int
    spot_codes: list[str]


class SpotUpdate(BaseModel):
    spot_code: Optional[str] = None
    status: Optional[str] = None


class SpotStatusUpdate(BaseModel):
    status: str


class Spot(SpotBase):
    id: int
    section_id: int
    last_updated: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# Parking Section (formerly Bay)
class ParkingSectionBase(BaseModel):
    name: str
    section_code: Optional[str] = None
    is_active: bool = True


class ParkingSectionCreate(ParkingSectionBase):
    parking_area_id: int


class ParkingSectionUpdate(BaseModel):
    name: Optional[str] = None
    section_code: Optional[str] = None
    is_active: Optional[bool] = None


class ParkingSection(ParkingSectionBase):
    id: int
    parking_area_id: int

    class Config:
        from_attributes = True


class ParkingSectionWithSpots(ParkingSection):
    spots: list[Spot] = []


# Parking Area
class ParkingAreaBase(BaseModel):
    name: str
    description: Optional[str] = None
    display_height: Optional[int] = None
    display_width: Optional[int] = None
    total_spots: int = 12
    total_sections: int = 4
    area_code: str
    is_active: bool = True


class ParkingAreaCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    display_height: int = Field(..., gt=0)
    display_width: int = Field(..., gt=0)
    total_sections: int = Field(..., ge=2, le=6)
    total_spots: int = Field(..., ge=2)
    area_code: str = Field(..., min_length=1)
    is_active: bool = True


class ParkingAreaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    display_height: Optional[int] = None
    display_width: Optional[int] = None
    total_spots: Optional[int] = Field(default=None, ge=2)
    total_sections: Optional[int] = Field(default=None, ge=2, le=6)
    area_code: Optional[str] = None
    is_active: Optional[bool] = None


class ParkingArea(ParkingAreaBase):
    id: int
    created_at: datetime
    sections: list[ParkingSectionWithSpots] = []
    devices: list["DeviceResponse"] = []

    class Config:
        from_attributes = True


class ParkingAreaDetail(ParkingArea):
    pass


class ParkingAreaMinimal(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


# Resolve forward references
from app.schemas.device import DeviceResponse  # noqa: E402

ParkingArea.model_rebuild()
ParkingAreaDetail.model_rebuild()
