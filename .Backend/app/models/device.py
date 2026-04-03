from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_uid = Column(String, unique=True, index=True, nullable=False)

    ip_address = Column(String, nullable=True)
    mac_address = Column(String, nullable=True)

    no_of_sensor_nodes = Column(Integer, default=0)
    active_sensor_nodes = Column(Integer, default=0)

    parking_area_id = Column(Integer, ForeignKey("parking_areas.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("parking_sections.id"), nullable=True)

    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    is_online = Column(Boolean, default=True)

    parking_area = relationship("ParkingArea", back_populates="devices")
    section = relationship("ParkingSection", back_populates="devices")
