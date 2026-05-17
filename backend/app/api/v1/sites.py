from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_sites() -> list[dict]:
    """TODO(P1, S1): SELECT * FROM sites."""
    return []


@router.post("", status_code=201)
async def create_site(payload: dict) -> dict:
    """TODO(P1, S1)."""
    return {"id": 0, **payload}


@router.get("/{site_id}")
async def get_site(site_id: int) -> dict:
    raise NotImplementedError
