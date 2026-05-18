from typing import Literal

from pydantic import BaseModel, Field

MaintenanceStatus = Literal["open", "in_progress", "done", "cancelled"]
MaintenancePhase = Literal["during_rain", "after_rain"]
TriggerSource = Literal["forecast_risk", "demo_storm", "rain_ended"]


class MaintenanceTaskPatch(BaseModel):
    status: MaintenanceStatus


class MaintenanceTaskOut(BaseModel):
    id: int
    machine_id: int | None = None
    site_id: int | None = None
    destination: str = ""
    what: str = ""
    why: str = ""
    crew_instructions: str = ""
    equipment: list[str] = Field(default_factory=list)
    phase: str = "during_rain"
    reason: str = ""
    reason_code: str = ""
    trigger_source: str = ""
    dedup_key: str = ""
    status: str = "open"
    assigned_to: str = ""
    priority: str = "normal"
    created_at: str = ""
    updated_at: str | None = None
    decision_ids: list[int] = Field(default_factory=list)
    rule_id: str | None = None
    created_by: str = "system"
