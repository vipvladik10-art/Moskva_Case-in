from fastapi import APIRouter

from app.api.v1 import (
    demo,
    forecasts,
    green_window,
    health,
    maintenance,
    plants,
    sites,
    trucks,
    ws,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(plants.router, prefix="/plants", tags=["plants"])
api_router.include_router(sites.router, prefix="/sites", tags=["sites"])
api_router.include_router(trucks.router, prefix="/trucks", tags=["trucks"])
api_router.include_router(forecasts.router, prefix="/sites", tags=["forecast"])
api_router.include_router(green_window.router, prefix="/sites", tags=["green-window"])
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])
api_router.include_router(demo.router, prefix="/demo", tags=["demo"])
api_router.include_router(ws.router, tags=["ws"])
