from rest_framework import serializers
from .models import ParkingArea, ParkingSection, Spot, Device, User
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "logo", "first_name", "last_name"]


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class SpotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spot
        fields = ["id", "spot_code", "section", "status", "min_dist", "max_dist", "last_updated", "created_at"]
        extra_kwargs = {
            'section': {'required': False},
        }

    def validate(self, data):
        min_dist = data.get("min_dist", self.instance.min_dist if self.instance else 50)
        max_dist = data.get("max_dist", self.instance.max_dist if self.instance else 100)
        if min_dist >= max_dist:
            raise serializers.ValidationError("Min distance must be less than Max distance.")
        return data


class SpotUpdateSerializer(serializers.Serializer):
    spot_code = serializers.CharField(required=False)
    status = serializers.CharField(required=False)
    min_dist = serializers.IntegerField(required=False)
    max_dist = serializers.IntegerField(required=False)

    def validate(self, data):
        # Note: This serializer is used for MQTT/Sensor updates which might not send all fields
        # So we might not always be able to validate min < max here without instance context
        # But if both are present:
        if 'min_dist' in data and 'max_dist' in data:
            if data['min_dist'] >= data['max_dist']:
                raise serializers.ValidationError("Min distance must be less than Max distance.")
        return data


class SensorPayloadSerializer(serializers.Serializer):
    spots = SpotUpdateSerializer(many=True)
    timestamp = serializers.DateTimeField(required=False, allow_null=True)


class HTTPSensorUpdateSerializer(serializers.Serializer):
    device_uid = serializers.CharField()
    spots = SpotUpdateSerializer(many=True)


class ParkingSectionSerializer(serializers.ModelSerializer):
    spots = serializers.SerializerMethodField()

    class Meta:
        model = ParkingSection
        fields = ["id", "name", "section_code", "parking_area", "is_active", "spots"]

    def get_spots(self, obj):
        spots = obj.spots.all().order_by("spot_code")
        return SpotSerializer(spots, many=True).data


class DeviceSerializer(serializers.ModelSerializer):
    sections = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')

    class Meta:
        model = Device
        fields = [
            "id",
            "device_uid",
            "name",
            "ip_address",
            "mac_address",
            "no_of_sensor_nodes",
            "active_sensor_nodes",
            "parking_area",
            "sections",
            "last_seen",
            "is_online",
            "debug_mode",
        ]


class ParkingAreaSerializer(serializers.ModelSerializer):
    sections = ParkingSectionSerializer(many=True, read_only=True)
    devices = serializers.SerializerMethodField()

    class Meta:
        model = ParkingArea
        fields = [
            "id",
            "name",
            "area_code",
            "description",
            "display_height",
            "display_width",
            "total_spots",
            "total_sections",
            "is_active",
            "created_at",
            "sections",
            "devices",
        ]
    
    def get_devices(self, obj):
        devices = obj.devices.all().order_by("-last_seen")
        return DeviceSerializer(devices, many=True).data


class ParkingAreaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingArea
        fields = [
            "name",
            "area_code",
            "description",
            "display_height",
            "display_width",
            "total_spots",
            "total_sections",
            "is_active",
        ]


class ParkingSectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingSection
        fields = ["name", "section_code", "parking_area", "is_active"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None:
            self.fields["parking_area"].read_only = True


class ParkingAreaMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParkingArea
        fields = ["id", "name"]
