from typing import List, Dict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Store connections as {area_code: [ws1, ws2], "all": [ws3]}
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, area_code: str = None):
        await websocket.accept()
        key = str(area_code) if area_code else "all"
        if key not in self.active_connections:
            self.active_connections[key] = []
        self.active_connections[key].append(websocket)

    def disconnect(self, websocket: WebSocket, area_code: str = None):
        key = str(area_code) if area_code else "all"
        if key in self.active_connections:
            if websocket in self.active_connections[key]:
                self.active_connections[key].remove(websocket)
            if not self.active_connections[key]:
                del self.active_connections[key]

    async def broadcast(self, message: dict, area_code: str = None):
        """
        Broadcast to specific area_code AND 'all'.
        If area_code is None, broadcast to EVERYONE.
        """
        targets = []

        # 1. Add "all" connections
        if "all" in self.active_connections:
            targets.extend(self.active_connections["all"])

        # 2. Add specific area connections
        if area_code:
            key = str(area_code)
            if key in self.active_connections:
                targets.extend(self.active_connections[key])
        elif area_code is None:
            # If no specific area targeted, send to ALL filtering groups
            for key_connections in self.active_connections.values():
                for connection in key_connections:
                    if connection not in targets:
                        targets.append(connection)

        # Send
        for connection in targets:
            try:
                await connection.send_json(message)
            except Exception:
                pass


class DashboardConnectionManager(ConnectionManager):
    pass


class LiveDisplayConnectionManager(ConnectionManager):
    pass


dashboard_manager = DashboardConnectionManager()
live_display_manager = LiveDisplayConnectionManager()
manager = dashboard_manager  # Alias for backward compatibility if needed
