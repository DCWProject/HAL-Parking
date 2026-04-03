from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class ParkingArea(Base):
    __tablename__ = "parking_areas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    area_code = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)

    display_height = Column(Integer, nullable=True)  # in inches
    display_width = Column(Integer, nullable=True)  # in inches
    total_spots = Column(Integer, default=12)
    total_sections = Column(Integer, default=4)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sections = relationship(
        "ParkingSection", back_populates="parking_area", cascade="all, delete-orphan"
    )
    devices = relationship(
        "Device", back_populates="parking_area", cascade="all, delete-orphan"
    )


class ParkingSection(Base):
    __tablename__ = "parking_sections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    section_code = Column(String, nullable=True)  # A, B, C etc

    parking_area_id = Column(Integer, ForeignKey("parking_areas.id"), nullable=False)
    is_active = Column(Boolean, default=True)

    parking_area = relationship("ParkingArea", back_populates="sections")
    spots = relationship("Spot", back_populates="section", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="section")


class Spot(Base):
    __tablename__ = "spots"

    id = Column(Integer, primary_key=True, index=True)
    spot_code = Column(String, index=True, nullable=False)
    section_id = Column(Integer, ForeignKey("parking_sections.id"), nullable=False)

    # Status: "OFFLINE", "AVAILABLE", "OCCUPIED"
    status = Column(String, default="OFFLINE")

    min_dist = Column(Integer, default=50)
    max_dist = Column(Integer, default=100)

    last_updated = Column(
        DateTime(timezone=True), onupdate=func.now(), server_default=func.now()
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    section = relationship("ParkingSection", back_populates="spots")

    __table_args__ = (
        UniqueConstraint("section_id", "spot_code", name="_section_spot_uc"),
    )
