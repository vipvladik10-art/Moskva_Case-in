from fastapi import APIRouter

from app import __version__
from app.schemas.common import HealthOut

router = APIRouter()


@router.get("/health", response_model=HealthOut)
async def health() -> HealthOut:
    return HealthOut(status="ok", version=__version__)
