from datetime import datetime

from pydantic import BaseModel, Field


class GreenWindowRequest(BaseModel):
    precip_threshold: float = Field(default=0.3, ge=0, le=1)
    min_duration_min: int = Field(default=60, ge=15)


class WindowInterval(BaseModel):
    start: datetime
    end: datetime
    duration_min: int


class GreenWindowAlternative(BaseModel):
    plant_id: int
    delivery_time_min: int
    confidence: float


class GreenWindowResponse(BaseModel):
    site_id: int
    window: WindowInterval | None
    plant_id: int | None
    delivery_time_min: int | None
    confidence: float
    baseline_duration_min: int | None = None
    ml_predicted_duration_min: int | None = None
    ml_method: str | None = None
    ml_confidence: float | None = None
    alternatives: list[GreenWindowAlternative] = []


class MaxTonnageRequest(BaseModel):
    plant_id: int | None = None


class MaxTonnageResponse(BaseModel):
    site_id: int
    plant_id: int
    t_window_min: int
    t_useful_min: int
    max_tonnage_t: float
    limiting_factor: str
    recommended_order_t: float
    explanation: str
