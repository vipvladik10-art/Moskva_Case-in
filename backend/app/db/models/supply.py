from decimal import Decimal

from sqlalchemy import Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class SupplyOrder(Base, TimestampMixin):
    __tablename__ = "supply_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    target_kind: Mapped[str] = mapped_column(String(16))
    target_id: Mapped[int] = mapped_column()
    item: Mapped[str] = mapped_column(String(64))
    quantity: Mapped[Decimal] = mapped_column(Numeric(8, 2))
    unit: Mapped[str] = mapped_column(String(8), default="l")
    reason: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32), default="new")
