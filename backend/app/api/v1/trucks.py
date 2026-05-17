from fastapi import APIRouter, HTTPException

from app.services.demo.state import demo_state

router = APIRouter()


@router.get("")
async def list_trucks() -> list[dict]:
    return demo_state.trucks()


@router.get("/{truck_id}")
async def get_truck(truck_id: int) -> dict:
    for t in demo_state.trucks():
        if t["id"] == truck_id:
            return t
    raise HTTPException(status_code=404, detail="Truck not found")
