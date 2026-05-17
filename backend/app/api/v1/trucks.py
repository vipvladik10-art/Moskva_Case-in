from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_trucks() -> list[dict]:
    """TODO(P1, S3)."""
    return []


@router.post("/{truck_id}/redirect")
async def redirect_truck(truck_id: int, payload: dict) -> dict:
    """TODO(P1, S3): принудительное перенаправление, см. services/logistics/dispatcher.py."""
    raise NotImplementedError


@router.get("/{truck_id}/history")
async def truck_history(truck_id: int) -> list[dict]:
    return []
