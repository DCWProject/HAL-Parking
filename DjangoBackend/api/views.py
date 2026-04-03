from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import authenticate
from django.conf import settings
import jwt
import datetime
import json
import paho.mqtt.client as mqtt
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import ParkingArea, ParkingSection, Spot, Device
from .serializers import (
    ParkingAreaSerializer,
    ParkingAreaMinimalSerializer,
    ParkingAreaCreateSerializer,
    ParkingSectionSerializer,
    ParkingSectionCreateSerializer,
    SpotSerializer,
    DeviceSerializer,
    LoginSerializer,
    HTTPSensorUpdateSerializer,
    UserSerializer,
)
from .services import process_sensor_data


class BaseViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet to standardize response messages
    """

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        model_name = self.queryset.model._meta.verbose_name.title()
        return Response(
            {"data": response.data, "message": f"{model_name} created successfully"},
            status=response.status_code,
        )

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        model_name = self.queryset.model._meta.verbose_name.title()
        return Response(
            {"data": response.data, "message": f"{model_name} updated successfully"},
            status=response.status_code,
        )

    def partial_update(self, request, *args, **kwargs):
        response = super().partial_update(request, *args, **kwargs)
        model_name = self.queryset.model._meta.verbose_name.title()
        return Response(
            {"data": response.data, "message": f"{model_name} updated successfully"},
            status=response.status_code,
        )

    def destroy(self, request, *args, **kwargs):
        super().destroy(request, *args, **kwargs)
        model_name = self.queryset.model._meta.verbose_name.title()
        return Response(
            {"data": None, "message": f"{model_name} deleted successfully"},
            status=status.HTTP_200_OK,
        )


class ParkingAreaViewSet(BaseViewSet):
    queryset = ParkingArea.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return ParkingAreaCreateSerializer
        return ParkingAreaSerializer

    @action(detail=False, methods=["get"], url_path="minimal")
    def minimal(self, request):
        queryset = ParkingArea.objects.all()
        serializer = ParkingAreaMinimalSerializer(queryset, many=True)
        return Response(
            {
                "data": serializer.data,
                "message": "Minimal parking area list fetched successfully",
            }
        )


class ParkingSectionViewSet(BaseViewSet):
    queryset = ParkingSection.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return ParkingSectionCreateSerializer
        return ParkingSectionSerializer


class SpotViewSet(BaseViewSet):
    queryset = Spot.objects.all()
    serializer_class = SpotSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk_create(self, request):
        section = request.data.get("section")
        try:
             parking_section = ParkingSection.objects.get(id=section)
        except ParkingSection.DoesNotExist:
             return Response({"error": "Section not found"}, status=status.HTTP_404_NOT_FOUND)
        
        spot_data_list = request.data.get("spots", []) # New format: list of {spot_code, min_dist, max_dist}
        # Fallback for old format or simple format
        if not spot_data_list and "spot_codes" in request.data:
            codes = request.data.get("spot_codes")
            spot_data_list = [{"spot_code": c, "min_dist": 50, "max_dist": 100} for c in codes]

        spots_to_create = []
        errors = []

        for item in spot_data_list:
            if isinstance(item, str): # Handle mixed case just in case
                item = {"spot_code": item, "min_dist": 50, "max_dist": 100}
            
            min_dist = int(item.get("min_dist", 50))
            max_dist = int(item.get("max_dist", 100))
            
            if min_dist >= max_dist:
                errors.append(f"Spot {item.get('spot_code')}: Min distance must be less than Max distance.")
                continue

            spots_to_create.append(Spot(
                section=parking_section, 
                spot_code=item.get("spot_code"),
                min_dist=min_dist,
                max_dist=max_dist
            ))
        
        if errors:
            return Response({"error": "Validation failed", "details": errors}, status=status.HTTP_400_BAD_REQUEST)

        created_spots = Spot.objects.bulk_create(spots_to_create)
        serializer = SpotSerializer(created_spots, many=True)
        return Response(
            {
                "data": serializer.data,
                "message": "Bulk spot creation successful",
            }
        )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeviceViewSet(BaseViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def partial_update(self, request, *args, **kwargs):
        if "debug_mode" in request.data:
            if request.data["debug_mode"] is True or request.data["debug_mode"] == "true":
                 request.data["debug_mode_updated_at"] = timezone.now()

        response = super().partial_update(request, *args, **kwargs)
        
        if "debug_mode" in request.data:
            device = self.get_object()
            self._send_debug_update(device)
            
        return response

    def _send_debug_update(self, device):
        try:
            client = mqtt.Client(client_id=f"django_debug_toggler_{device.id}")
            client.connect("localhost", 1883, 60)
            
            area_code = device.parking_area.area_code if device.parking_area else "default"
            topic = f"parking/{area_code}/{device.device_uid}/command"
            
            payload = {
                "action": "update_config", 
                "debug": device.debug_mode,
                "spots": []
            }
            
            client.publish(topic, json.dumps(payload))
            client.disconnect()
        except Exception as e:
            print(f"Failed to send debug update: {e}")

    @action(detail=True, methods=["post"])
    def restart(self, request, pk=None):
        device = self.get_object()
        
        try:
            client = mqtt.Client(client_id=f"django_restarter_{device.id}")
            client.connect("localhost", 1883, 60)
            
            area_code = device.parking_area.area_code if device.parking_area else "default"
            topic = f"parking/{area_code}/{device.device_uid}/command"
            payload = {"action": "reboot"}
            
            client.publish(topic, json.dumps(payload))
            client.disconnect()
            
            return Response({"message": f"Restart command sent to {device.device_uid}"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def reset_spots(self, request, pk=None):
        """
        Manually resets all spots associated with this device to 'AVAILABLE'.
        Useful for clearing stuck states during debugging or maintenance.
        """
        device = self.get_object()

        if device.is_online:
            return Response(
                {"error": "Device must be OFFLINE to reset spots directly."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        spots = Spot.objects.filter(section__in=device.sections.all())
        updated_count = spots.update(status="OFFLINE")
        
        channel_layer = get_channel_layer()
        area_code = device.parking_area.area_code if device.parking_area else None
        
        if area_code and updated_count > 0:
            updated_spots = Spot.objects.filter(section__in=device.sections.all())
            
            spot_data_list = []
            for spot in updated_spots:
                spot_data_list.append({
                    "id": spot.id,
                    "spot_code": spot.spot_code,
                    "status": 0,
                    "section_id": spot.section_id,
                })
            
            event = {
                "type": "spot_update",
                "data": spot_data_list
            }
            
            async_to_sync(channel_layer.group_send)(
                f"parking_detail_{area_code}", event
            )
            async_to_sync(channel_layer.group_send)(
                f"dashboard_{area_code}", event
            )

        return Response({
            "message": f"Reset {updated_count} spots to AVAILABLE for device {device.device_uid}",
            "updated_count": updated_count
        })


class SensorUpdateView(APIView):
    def post(self, request):
        serializer = HTTPSensorUpdateSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            try:
                # Synchronous call for now, could be offloaded to Huey
                process_sensor_data(data["device_uid"], data["spots"])
                return Response(
                    {"message": "Sensor update processed"},
                    status=status.HTTP_202_ACCEPTED,
                )
            except Exception as e:
                return Response(
                    {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            password = serializer.validated_data["password"]
            user = authenticate(username=email, password=password)
            if user:
                payload = {
                    "id": user.id,
                    "email": user.email,
                    "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1),
                    "iat": datetime.datetime.utcnow(),
                }
                token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

                # Renderer will unwrap message
                response = Response(
                    {"message": "Login Successful", "access_token": token}
                )
                response.set_cookie(
                    key="access_token", value=token, httponly=True, max_age=24 * 60 * 60
                )
                return response
            return Response(
                {"detail": "Invalid Credentials"}, status=status.HTTP_401_UNAUTHORIZED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "data": UserSerializer(request.user).data,
                "message": "User fetched successfully",
            }
        )


class LogoutView(APIView):
    def post(self, request):
        # Explicit data=None to ensure data: null in response
        response = Response({"message": "Logout Successful", "data": None})
        response.delete_cookie("access_token")
        return response
