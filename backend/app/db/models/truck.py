from datetime import datetime
from decimal import Decimal

from geoalchemy2 import Geography
from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin

TRUCK_STATUSES = ("idle", "loading", "en_route", "waiting", "unloading", "maintenance")


class Truck(Base, TimestampMixin):
    __tablename__ = "trucks"

    id: Mapped[int] = mapped_column(primary_key=True)
    plate: Mapped[str] = mapped_column(String(32), unique=True)
    status: Mapped[str] = mapped_column(String(32), default="idle")
    destination_site_id: Mapped[int | None] = mapped_column(ForeignKey("sites.id"), nullable=True)
    home_plant_id: Mapped[int | None] = mapped_column(ForeignKey("plants.id"), nullable=True)
    load_t: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=Decimal("0.0"))
    loaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_geom: Mapped[str | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )


class TruckDispatchLog(Base):
    __tablename__ = "truck_dispatch_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    truck_id: Mapped[int] = mapped_column(ForeignKey("trucks.id"))
    from_site_id: Mapped[int | None] = mapped_column(ForeignKey("sites.id"), nullable=True)
    to_site_id: Mapped[int | None] = mapped_column(ForeignKey("sites.id"), nullable=True)
    reason: Mapped[str] = mapped_column(String(64))
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    decided_by: Mapped[str] = mapped_column(String(64), default="system")
