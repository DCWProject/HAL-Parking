from fastapi import APIRouter, HTTPException, BackgroundTasks
from app import schemas
from app.services.sensor_service import process_sensor_data
from app.schemas.response import ResponseModel
from app.core.response import create_response

router = APIRouter(prefix="/sensor", tags=["Sensor Integration"])


@router.post("/http/update", response_model=ResponseModel[dict])
async def sensor_http_update(
    payload: schemas.HTTPSensorUpdate, background_tasks: BackgroundTasks
):
    try:
        # We can reuse the payload schema or adapt it
        # SensorPayload expects 'spots' and optional timestamp
        sensor_data = schemas.SensorPayload(
            spots=payload.spots, timestamp=None  # Will rely on server time if missing
        )

        # Process in background to avoid blocking response
        background_tasks.add_task(process_sensor_data, payload.device_uid, sensor_data)

        return create_response(
            data=None, message="Sensor update accepted for processing", status_code=202
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
