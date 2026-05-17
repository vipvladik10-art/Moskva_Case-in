"""Pipeline записи прогнозов в TimescaleDB для последующего ML-обучения.

Поток данных:
- Каждый раз, когда сервис получает прогноз от провайдера (OpenWeatherMap / mock),
  мы можем дополнительно сохранить его в `forecast_hourly` (TimescaleDB hypertable).
- Через несколько недель накапливается датасет (forecast, fact_weather), пригодный
  для обучения калибратора и предиктора зелёного окна.

Сейчас функция `persist_forecast` намеренно проектируется как fire-and-forget с
graceful no-op:
- если БД недоступна, логируем warning и возвращаем 0;
- если запись существует (composite PK совпал), используем upsert через ON CONFLICT.

Дальнейшие шаги (TODO E2):
1. Cron / arq-worker, дергающий этот pipeline каждый час по расписанию.
2. Загрузчик факта погоды (`actuals_hourly`) — отдельная таблица.
3. Скрипт обучения `scripts/train_calibrator.py` — читает join, обучает sklearn,
   сохраняет в `data/models/calibrator.joblib`.
"""

from __future__ import annotations

import logging
from decimal import Decimal

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ForecastHourly
from app.schemas.weather import HourlyForecast

logger = logging.getLogger(__name__)


async def persist_forecast(
    session: AsyncSession,
    site_id: int,
    forecast: list[HourlyForecast],
) -> int:
    """Записать прогноз в БД. Возвращает количество вставленных/обновлённых строк.

    Использует PostgreSQL UPSERT: по PK (site_id, valid_at, source) обновляются
    только последние значения от того же источника. Это позволяет хранить
    исторические прогнозы и сравнивать их с фактической погодой.
    """
    if not forecast:
        return 0

    rows = [
        {
            "site_id": site_id,
            "valid_at": h.valid_at,
            "issued_at": h.issued_at,
            "source": h.source,
            "temp_c": Decimal(str(round(float(h.temp_c), 1))),
            "precip_mm_h": Decimal(str(round(float(h.precip_mm_h), 2))),
            "precip_probability": Decimal(str(round(float(h.precip_probability), 2))),
            "wind_speed_ms": Decimal(str(round(float(h.wind_speed_ms), 1))),
            "confidence": Decimal(str(round(float(h.confidence), 2))),
        }
        for h in forecast
    ]

    try:
        stmt = pg_insert(ForecastHourly).values(rows)
        stmt = stmt.on_conflict_do_update(
            index_elements=["site_id", "valid_at", "source"],
            set_={
                "issued_at": stmt.excluded.issued_at,
                "temp_c": stmt.excluded.temp_c,
                "precip_mm_h": stmt.excluded.precip_mm_h,
                "precip_probability": stmt.excluded.precip_probability,
                "wind_speed_ms": stmt.excluded.wind_speed_ms,
                "confidence": stmt.excluded.confidence,
            },
        )
        result = await session.execute(stmt)
        await session.commit()
        return result.rowcount or len(rows)
    except Exception as exc:
        await session.rollback()
        logger.warning("persist_forecast failed for site %s: %s", site_id, exc)
        return 0
