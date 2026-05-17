from decimal import Decimal

from geoalchemy2 import Geography
from sqlalchemy import Boolean, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Site(Base, TimestampMixin):
    __tablename__ = "sites"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    geom_point: Mapped[str] = mapped_column(Geography(geometry_type="POINT", srid=4326))
    geom_line: Mapped[str | None] = mapped_column(
        Geography(geometry_type="LINESTRING", srid=4326), nullable=True
    )
    lane_width_m: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("4.0"))
    layer_thickness_m: Mapped[Decimal] = mapped_column(Numeric(4, 3), default=Decimal("0.05"))
    mix_density_t_m3: Mapped[Decimal] = mapped_column(Numeric(4, 2), default=Decimal("2.40"))
    mix_type: Mapped[str] = mapped_column(String(64), default="ЩМА-15")
    thin_layer: Mapped[bool] = mapped_column(Boolean, default=False)
    preferred_plant_id: Mapped[int | None] = mapped_column(ForeignKey("plants.id"), nullable=True)
