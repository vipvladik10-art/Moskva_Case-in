from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, PrimaryKeyConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ForecastHourly(Base):
    """Часовой прогноз погоды для участка от одного источника.

    Хранится как TimescaleDB hypertable (миграция включает create_hypertable).
    Композитный PK: (site_id, valid_at, source).
    """

    __tablename__ = "forecast_hourly"

    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"), nullable=False)
    valid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    temp_c: Mapped[Decimal] = mapped_column(Numeric(4, 1))
    precip_mm_h: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("0"))
    precip_probability: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("0"))
    wind_speed_ms: Mapped[Decimal] = mapped_column(Numeric(4, 1), default=Decimal("0"))
    confidence: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("1"))

    __table_args__ = (PrimaryKeyConstraint("site_id", "valid_at", "source"),)
