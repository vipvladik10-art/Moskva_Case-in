from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_plants() -> list[dict]:
    """TODO(P1, S1): SELECT * FROM plants."""
    return []


@router.post("", status_code=201)
async def create_plant(payload: dict) -> dict:
    """TODO(P1, S1): INSERT plant с geometry from lat/lon."""
    return {"id": 0, **payload}


@router.get("/{plant_id}")
async def get_plant(plant_id: int) -> dict:
    raise NotImplementedError
