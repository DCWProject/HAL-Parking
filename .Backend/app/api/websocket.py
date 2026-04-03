from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core import websocket
from app.core.database import SessionLocal
from app import models

router = APIRouter(tags=["Real-time"])


@router.websocket("/ws/dashboard")
async def dashboard_websocket(
    ws: WebSocket, area_code: str | None = Query(None, alias="area_code")
):
    await websocket.dashboard_manager.connect(ws, area_code=area_code)

    # Initial State for Dashboard (Full Data or Filtered)
    if area_code:
        db = SessionLocal()
        try:
            # Find Area by Code to get ID
            area = (
                db.query(models.ParkingArea)
                .filter(models.ParkingArea.area_code == area_code)
                .first()
            )

            if area:
                # We might want to send ALL spots for dashboard, not just available ones
                spots = (
                    db.query(models.Spot)
                    .join(models.ParkingSection)
                    .filter(models.ParkingSection.parking_area_id == area.id)
                    .all()
                )

                payload = {
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
                await ws.send_json(payload)
        except Exception as e:
            print(f"Dashboard WS Error: {e}")
        finally:
            db.close()

    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        websocket.dashboard_manager.disconnect(ws, area_code=area_code)


@router.websocket("/ws/live")
async def live_display_websocket(
    ws: WebSocket, area_code: str | None = Query(None, alias="area_code")
):
    if not area_code:
        await ws.close(code=1008, reason="area_code is required")
        return

    # Connect using area_code as the grouping key
    await websocket.live_display_manager.connect(ws, area_code=area_code)

    db = SessionLocal()
    try:
        # Find Area by Code
        area = (
            db.query(models.ParkingArea)
            .filter(models.ParkingArea.area_code == area_code)
            .first()
        )

        if area:
            # Fetch All Sections for this area, ordered by name
            sections = (
                db.query(models.ParkingSection)
                .filter(models.ParkingSection.parking_area_id == area.id)
                .order_by(models.ParkingSection.name)
                .all()
            )

            sections_data = []
            for section in sections:
                # Fetch top 4 AVAILABLE spots for this section, ordered by spot_code
                spots = (
                    db.query(models.Spot)
                    .filter(
                        models.Spot.section_id == section.id,
                        models.Spot.status == "AVAILABLE",
                    )
                    .order_by(models.Spot.spot_code)
                    .limit(4)
                    .all()
                )

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
                            for s in spots
                        ],
                    }
                )

            payload = {
                "type": "init_live_display",
                "area_name": area.name,
                "area_code": area.area_code,
                "total_sections": len(sections),
                "sections": sections_data,
            }
            await ws.send_json(payload)
        else:
            await ws.send_json({"type": "error", "message": "Invalid Area Code"})
            # Optionally close connection? keeping open for now.
    except Exception as e:
        print(f"Live Display WS Error: {e}")
    finally:
        db.close()

    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        websocket.live_display_manager.disconnect(ws, area_code=area_code)
