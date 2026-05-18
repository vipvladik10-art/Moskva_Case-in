from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import CurrentUser, require_admin
from app.schemas.catalog import MapMarkerCreatePayload, MapMarkerUpdatePayload
from app.services.demo.state import demo_state

router = APIRouter()


@router.get("")
async def list_markers() -> list[dict]:
    return demo_state.map_markers()


@router.post("")
async def create_marker(
    payload: MapMarkerCreatePayload,
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> dict:
    return demo_state.add_map_marker(payload.model_dump(exclude_none=True))


@router.patch("/{marker_id}")
async def update_marker(
    marker_id: int,
    payload: MapMarkerUpdatePayload,
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> dict:
    updated = demo_state.update_map_marker(
        marker_id, payload.model_dump(exclude_none=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Marker not found")
    return updated


@router.delete("/{marker_id}")
async def delete_marker(
    marker_id: int,
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> dict:
    if not demo_state.delete_map_marker(marker_id):
        raise HTTPException(status_code=404, detail="Marker not found")
    return {"status": "ok", "id": marker_id}
