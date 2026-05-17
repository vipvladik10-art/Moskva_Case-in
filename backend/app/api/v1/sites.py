from fastapi import APIRouter, HTTPException

from app.services.demo.state import demo_state

router = APIRouter()


@router.get("")
async def list_sites() -> list[dict]:
    return demo_state.sites()


@router.get("/{site_id}")
async def get_site(site_id: int) -> dict:
    site = demo_state.site(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site
