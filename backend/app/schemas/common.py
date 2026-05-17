from pydantic import BaseModel, Field


class LatLon(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class HealthOut(BaseModel):
    status: str = "ok"
    version: str
    git_sha: str | None = None
