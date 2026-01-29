from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import asyncio
from contextlib import asynccontextmanager
import logging
from app.core.logging import LOGGING_CONFIG
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.core.response import error_response
from app.core.mqtt import start_mqtt

from app.api import auth, parking_area, section, spot, sensor, websocket
from app import models
from app.services.monitor import check_offline_devices_task
from app.dependencies import get_db


from datetime import datetime
from fastapi import Depends


@asynccontextmanager
async def lifespan(app: FastAPI):
    mqtt_client = start_mqtt()
    monitor_task = asyncio.create_task(check_offline_devices_task())
    yield
    # Shutdown
    if monitor_task:
        monitor_task.cancel()
        try:
            await monitor_task
        except asyncio.CancelledError:
            pass  # Task cancelled successfully

    if mqtt_client:
        mqtt_client.disconnect()


# Create tables
# In production with Alembic, we usually comment this out, but for dev it's fine to keep or use alembic only.
# Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)


############################### Global Exception Handlers ################################
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return error_response(
        message=exc.detail,
        status_code=exc.status_code,
        errors={"non_field_errors": [exc.detail]},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = {}
    for error in exc.errors():
        field = error.get("loc", ["unknown"])[-1]
        msg = error.get("msg", "Invalid value")
        if field in errors:
            errors[field].append(msg)
        else:
            errors[field] = [msg]

    return error_response(message="Validation failed", status_code=422, errors=errors)


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    # In production, log the error here
    print(f"Internal Server Error: {exc}")
    return error_response(
        message="Internal server error",
        status_code=500,
        errors=(
            {"non_field_errors": [str(exc)]}
            if settings.PROJECT_NAME == "Smart Parking System"
            else None
        ),  # Show details only in dev if safe
    )


##########################################################
####################### MIDDLEWARE #######################
##########################################################

## -- CORS Configuration -- ##
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

################# Include Routers #################
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(parking_area.router, prefix=settings.API_V1_STR)
app.include_router(section.router, prefix=settings.API_V1_STR)
app.include_router(spot.router, prefix=settings.API_V1_STR)
app.include_router(sensor.router, prefix=settings.API_V1_STR)
app.include_router(websocket.router)


################# Logging Configuration #################
logging.config.dictConfig(LOGGING_CONFIG)


@app.get("/", response_class=HTMLResponse)
def read_root():
    return """
    <html>
        <head>
            <title>InteliPark API</title>
        </head>
        <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <h1>Welcome to InteliPark API</h1>
            <p>Go to <a href="/docs">/docs</a> to view the API documentation.</p>
            <p>Go to <a href="/redoc">/redoc</a> to view the API documentation.</p>
        </body>
    </html>
    """
