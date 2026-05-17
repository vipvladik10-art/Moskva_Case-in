from decimal import Decimal

from geoalchemy2 import Geography
from sqlalchemy import Boolean, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Plant(Base, TimestampMixin):
    __tablename__ = "plants"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    geom: Mapped[str] = mapped_column(Geography(geometry_type="POINT", srid=4326))
    capacity_t_per_hour: Mapped[Decimal] = mapped_column(Numeric(6, 2))
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
