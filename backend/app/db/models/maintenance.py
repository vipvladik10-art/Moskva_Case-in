from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class MaintenanceTask(Base, TimestampMixin):
    __tablename__ = "maintenance_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    machine_id: Mapped[int | None] = mapped_column(ForeignKey("trucks.id"), nullable=True)
    site_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    destination: Mapped[str | None] = mapped_column(String(256), nullable=True)
    what: Mapped[str | None] = mapped_column(Text, nullable=True)
    why: Mapped[str | None] = mapped_column(Text, nullable=True)
    crew_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    equipment: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    phase: Mapped[str] = mapped_column(String(32), default="during_rain")
    reason: Mapped[str] = mapped_column(String(256), default="weather_idle")
    reason_code: Mapped[str] = mapped_column(String(64), default="")
    trigger_source: Mapped[str] = mapped_column(String(32), default="")
    dedup_key: Mapped[str] = mapped_column(String(128), default="", index=True)
    decision_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    rule_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_by: Mapped[str] = mapped_column(String(32), default="system")
    status: Mapped[str] = mapped_column(String(32), default="open")
    assigned_to: Mapped[str | None] = mapped_column(String(128), nullable=True)
    priority: Mapped[str] = mapped_column(String(16), default="normal")
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
