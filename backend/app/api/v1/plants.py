from fastapi import APIRouter, HTTPException

from app.services.demo.state import demo_state

router = APIRouter()


@router.get("")
async def list_plants() -> list[dict]:
    return demo_state.plants()


@router.get("/{plant_id}")
async def get_plant(plant_id: int) -> dict:
    plant = demo_state.plant(plant_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant
