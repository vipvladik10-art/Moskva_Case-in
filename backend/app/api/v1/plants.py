from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import CurrentUser, require_admin
from app.schemas.catalog import PlantCreatePayload, PlantUpdatePayload
from app.services.demo.state import demo_state

router = APIRouter()


@router.get("")
async def list_plants() -> list[dict]:
    return demo_state.plants()


@router.post("")
async def create_plant(
    payload: PlantCreatePayload,
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> dict:
    return demo_state.add_plant(payload.model_dump(exclude_none=True))


@router.get("/{plant_id}")
async def get_plant(plant_id: int) -> dict:
    plant = demo_state.plant(plant_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant


@router.patch("/{plant_id}")
async def update_plant(
    plant_id: int,
    payload: PlantUpdatePayload,
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> dict:
    updated = demo_state.update_plant(plant_id, payload.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Plant not found")
    return updated


@router.delete("/{plant_id}")
async def delete_plant(
    plant_id: int,
    _admin: Annotated[CurrentUser, Depends(require_admin)],
) -> dict:
    if not demo_state.delete_plant(plant_id):
        raise HTTPException(status_code=404, detail="Plant not found")
    return {"status": "ok", "id": plant_id}
