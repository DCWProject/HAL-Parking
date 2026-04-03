from app.schemas.auth import Token, TokenData, AdminLogin, AdminResponse
from app.schemas.parking import (
    Spot,
    SpotCreate,
    SpotCreateBulk,
    SpotCreateRequest,
    SpotUpdate,
    SpotStatusUpdate,
    ParkingSection,
    ParkingSectionCreate,
    ParkingSectionUpdate,
    ParkingArea,
    ParkingAreaMinimal,
    ParkingAreaDetail,
    ParkingAreaCreate,
    ParkingAreaUpdate,
)
from app.schemas.device import (
    DeviceCreate,
    DeviceUpdate,
    DeviceResponse,
    SensorPayload,
    HTTPSensorUpdate,
)
