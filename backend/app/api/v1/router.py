from fastapi import APIRouter

from app.api.v1 import (
    auth,
    decision_rules,
    demo,
    fleet,
    forecasts,
    green_window,
    health,
    map_markers,
    map_tiles,
    maintenance,
    ml,
    plants,
    sites,
    trucks,
    ws,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(map_tiles.router, tags=["map-tiles"])
api_router.include_router(plants.router, prefix="/plants", tags=["plants"])
api_router.include_router(sites.router, prefix="/sites", tags=["sites"])
api_router.include_router(map_markers.router, prefix="/map-markers", tags=["map-markers"])
api_router.include_router(trucks.router, prefix="/trucks", tags=["trucks"])
api_router.include_router(forecasts.router, prefix="/sites", tags=["forecast"])
api_router.include_router(green_window.router, prefix="/sites", tags=["green-window"])
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])
api_router.include_router(fleet.router, prefix="/fleet", tags=["fleet"])
api_router.include_router(
    decision_rules.router, prefix="/decision-rules", tags=["decision-rules"]
)
api_router.include_router(demo.router, prefix="/demo", tags=["demo"])
api_router.include_router(ml.router, prefix="/ml", tags=["ml"])
api_router.include_router(ws.router, tags=["ws"])
