import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ParkingArea, Spot, ParkingSection
from .services import get_live_display_data_for_section


class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Try to get from kwargs first
        self.area_code = self.scope["url_route"]["kwargs"].get("area_code")

        # If not in kwargs, get from query params
        if not self.area_code:
            query_string = self.scope.get("query_string", b"").decode("utf-8")
            from urllib.parse import parse_qs

            query_params = parse_qs(query_string)
            self.area_code = query_params.get("area_code", [None])[0]

        if not self.area_code:
            await self.close()
            return

        self.group_name = f"dashboard_{self.area_code}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.send_initial_state()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def spot_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def device_offline(self, event):
        await self.send(text_data=json.dumps(event))

    async def send_initial_state(self):
        data = await self.get_initial_data()
        if data:
            await self.send(text_data=json.dumps(data))

    @database_sync_to_async
    def get_initial_data(self):
        if not self.area_code:
            return None
        area = ParkingArea.objects.filter(area_code=self.area_code).first()
        if not area:
            return None

        spots = Spot.objects.filter(section__parking_area=area).all()
        return {
            "type": "spot_update",
            "data": [
                {
                    "id": s.id,
                    "spot_code": s.spot_code,
                    "status": s.status,
                    "section_id": s.section_id,
                }
                for s in spots
            ],
        }


class LiveDisplayConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.area_code = self.scope["url_route"]["kwargs"].get("area_code")

        if not self.area_code:
            query_string = self.scope.get("query_string", b"").decode("utf-8")
            from urllib.parse import parse_qs

            query_params = parse_qs(query_string)
            self.area_code = query_params.get("area_code", [None])[0]

        if not self.area_code:
            await self.close()
            return

        self.group_name = f"live_display_{self.area_code}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.send_initial_state()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def live_slots_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def send_initial_state(self):
        data = await self.get_initial_data()
        if data:
            await self.send(text_data=json.dumps(data))

    @database_sync_to_async
    def get_initial_data(self):
        area = ParkingArea.objects.filter(area_code=self.area_code).first()
        if not area:
            return {"type": "error", "message": "Invalid Area Code"}

        sections = (
            ParkingSection.objects.filter(parking_area=area).order_by("name").all()
        )
        sections_data = []

        for section in sections:
            # Replaced with shared logic
            top_spots = get_live_display_data_for_section(section.id)

            sections_data.append(
                {
                    "id": section.id,
                    "name": section.name,
                    "section_code": section.section_code,
                    "spots": [
                        {
                            "id": s.id,
                            "spot_code": s.spot_code,
                            "status": s.status,
                            "section_id": s.section_id,
                        }
                        for s in top_spots
                    ],
                }
            )

        return {
            "type": "init_live_display",
            "area_name": area.name,
            "area_code": area.area_code,
            "total_sections": len(sections),
            "sections": sections_data,
        }


class ParkingDetailConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Try to get from kwargs first
        self.area_code = self.scope["url_route"]["kwargs"].get("area_code")

        # If not in kwargs, get from query params
        if not self.area_code:
            query_string = self.scope.get("query_string", b"").decode("utf-8")
            from urllib.parse import parse_qs

            query_params = parse_qs(query_string)
            self.area_code = query_params.get("area_code", [None])[0]

        if not self.area_code:
            await self.close()
            return

        self.group_name = f"parking_detail_{self.area_code}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def spot_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def device_offline(self, event):
        await self.send(text_data=json.dumps(event))

    async def device_log(self, event):
        await self.send(text_data=json.dumps(event))


class DeviceLogConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.device_uid = self.scope["url_route"]["kwargs"].get("device_uid")
        
        if not self.device_uid:
            await self.close()
            return
            
        self.group_name = f"device_logs_{self.device_uid}"
        
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        
    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            
    async def device_log(self, event):
        await self.send(text_data=json.dumps(event))
