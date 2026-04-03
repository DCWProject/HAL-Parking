from pydantic import BaseModel, model_validator
from datetime import datetime
from typing import Optional, List, Any


# Basic Device Schemas
class DeviceBase(BaseModel):
    device_uid: str
    ip_address: Optional[str] = None
    no_of_sensor_nodes: Optional[int] = None
    active_sensor_nodes: Optional[int] = None
    parking_area_id: int
    section_id: Optional[int] = None


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    ip_address: Optional[str] = None
    no_of_sensor_nodes: Optional[int] = None
    active_sensor_nodes: Optional[int] = None
    section_id: Optional[int] = None
    is_online: Optional[bool] = None


class DeviceResponse(BaseModel):
    id: int
    device_uid: str
    ip_address: Optional[str] = None
    no_of_sensor_nodes: Optional[int] = None
    active_sensor_nodes: Optional[int] = None
    parking_area_id: int
    section_id: Optional[int] = None
    last_seen: datetime
    is_online: bool

    class Config:
        from_attributes = True


# Data Payloads (MQTT/HTTP)
class SpotData(BaseModel):
    spot_code: str
    section_code: str
    status: str  # "AVAILABLE", "OCCUPIED", "OFFLINE"


class SensorPayload(BaseModel):
    device_uid: Optional[str] = None  # Optional in MQTT topic, mandatory in HTTP
    area_code: Optional[str] = None
    spots: List[SpotData]


class HTTPSensorUpdate(BaseModel):
    device_uid: str
    spots: List[SpotData]
