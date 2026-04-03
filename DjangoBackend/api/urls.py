from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ParkingAreaViewSet,
    ParkingSectionViewSet,
    SpotViewSet,
    DeviceViewSet,
    SensorUpdateView,
    LoginView,
    LogoutView,
    UserMeView,
)

router = DefaultRouter()
router.register(r"parking-areas", ParkingAreaViewSet)
router.register(r"sections", ParkingSectionViewSet)
router.register(r"spots", SpotViewSet)
router.register(r"devices", DeviceViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("sensor/http/update/", SensorUpdateView.as_view(), name="sensor-update"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", UserMeView.as_view(), name="user-me"),
]
