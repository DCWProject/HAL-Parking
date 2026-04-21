from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    # Admin in original system
    logo = models.CharField(max_length=255, null=True, blank=True)

    # Use email as the primary identifier
    email = models.EmailField(unique=True)
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email


class ParkingArea(models.Model):
    name = models.CharField(max_length=255, unique=True, db_index=True)
    area_code = models.CharField(max_length=255, unique=True, db_index=True)
    description = models.TextField(null=True, blank=True)
    display_height = models.IntegerField(null=True, blank=True)
    display_width = models.IntegerField(null=True, blank=True)
    total_spots = models.IntegerField(default=12)
    total_sections = models.IntegerField(default=4)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "parking_areas"

    def __str__(self):
        return self.name


class ParkingSection(models.Model):
    name = models.CharField(max_length=255, db_index=True)
    section_code = models.CharField(max_length=255, null=True, blank=True)
    parking_area = models.ForeignKey(
        ParkingArea, on_delete=models.CASCADE, related_name="sections"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "parking_sections"

    def __str__(self):
        return self.name


class Spot(models.Model):
    STATUS_CHOICES = [
        ("OFFLINE", "Offline"),
        ("AVAILABLE", "Available"),
        ("OCCUPIED", "Occupied"),
    ]
    spot_code = models.CharField(max_length=255, db_index=True)
    section = models.ForeignKey(
        ParkingSection, on_delete=models.CASCADE, related_name="spots"
    )
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="OFFLINE")
    offline_last_status = models.CharField(
        max_length=50,
        choices=[("AVAILABLE", "Available"), ("OCCUPIED", "Occupied")],
        default="AVAILABLE",
    )
    last_raw_status = models.CharField(max_length=50, default="OFFLINE")
    raw_status_started_at = models.DateTimeField(null=True, blank=True)
    status_changed_at = models.DateTimeField(null=True, blank=True)

    min_dist = models.IntegerField(default=50)
    max_dist = models.IntegerField(default=100)
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "spots"
        constraints = [
            models.UniqueConstraint(
                fields=["section", "spot_code"], name="unique_section_spot"
            )
        ]

    def __str__(self):
        return f"{self.section.section_code}-{self.spot_code}"


class Device(models.Model):
    name = models.CharField(max_length=255, unique=True, null=True, blank=True)
    device_uid = models.CharField(max_length=255, unique=True, db_index=True)
    ip_address = models.CharField(max_length=255, null=True, blank=True)
    mac_address = models.CharField(max_length=255, null=True, blank=True)
    no_of_sensor_nodes = models.IntegerField(default=0)
    active_sensor_nodes = models.IntegerField(default=0)
    parking_area = models.ForeignKey(
        ParkingArea, on_delete=models.CASCADE, related_name="devices"
    )
    section = models.ForeignKey(
        ParkingSection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="devices",
    )
    last_seen = models.DateTimeField(auto_now_add=True)
    is_online = models.BooleanField(default=True)
    debug_mode = models.BooleanField(default=False)
    debug_mode_updated_at = models.DateTimeField(null=True, blank=True)

    # New M2M field
    sections = models.ManyToManyField(
        ParkingSection,
        blank=True,
        related_name="devices_m2m",
    )

    class Meta:
        db_table = "devices"

    def __str__(self):
        return self.device_uid
