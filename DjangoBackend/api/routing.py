from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/dashboard/?$", consumers.DashboardConsumer.as_asgi()),
    re_path(r"ws/live/?$", consumers.LiveDisplayConsumer.as_asgi()),
    re_path(
        r"ws/dashboard/(?P<area_code>\w+)/$", consumers.DashboardConsumer.as_asgi()
    ),
    re_path(r"ws/live/(?P<area_code>\w+)/$", consumers.LiveDisplayConsumer.as_asgi()),
    re_path(r"ws/parking_detail/?$", consumers.ParkingDetailConsumer.as_asgi()),
    re_path(
        r"ws/parking_detail/(?P<area_code>\w+)/$",
        consumers.ParkingDetailConsumer.as_asgi(),
    ),
    re_path(
        r"ws/device_logs/(?P<device_uid>[\w-]+)/$",
        consumers.DeviceLogConsumer.as_asgi(),
    ),
]
