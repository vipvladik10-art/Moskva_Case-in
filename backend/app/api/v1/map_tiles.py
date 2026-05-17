import httpx
from fastapi import APIRouter, HTTPException, Response

from app.core.config import settings

router = APIRouter()

OWM_TILE_LAYERS = {
    "precipitation_new",
    "clouds_new",
    "temp_new",
    "wind_new",
}


@router.get("/map-tiles/{layer}/{z}/{x}/{y}.png")
async def openweather_tile(layer: str, z: int, x: int, y: int) -> Response:
    if layer not in OWM_TILE_LAYERS:
        raise HTTPException(status_code=404, detail="Unknown weather tile layer")
    if not settings.openweather_api_key:
        raise HTTPException(status_code=503, detail="OPENWEATHER_API_KEY is not configured")

    url = f"https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            upstream = await client.get(url, params={"appid": settings.openweather_api_key})
            upstream.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail="Weather tile unavailable") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Weather tile upstream error") from exc

    return Response(
        content=upstream.content,
        media_type=upstream.headers.get("content-type", "image/png"),
        headers={"Cache-Control": "public, max-age=300"},
    )
