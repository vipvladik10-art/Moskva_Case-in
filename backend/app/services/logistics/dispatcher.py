"""Динамическое перенаправление самосвалов при изменении погоды.

См. docs/algorithms.md §5. Ответственный: P1, требования: E1.
"""

from dataclasses import dataclass


@dataclass
class RedirectDecision:
    truck_id: int
    from_site_id: int
    to_site_id: int | None
    reason: str


async def redirect_trucks_on_rain(site_id: int) -> list[RedirectDecision]:
    """TODO(P1, спринт 3): найти en_route самосвалы с destination=site_id
    и для каждого подобрать ближайший участок с открытым зелёным окном.

    Шаги:
      1. SELECT trucks WHERE destination_site_id = site_id AND status = 'en_route'.
      2. Для каждого получить координаты и оставшийся ресурс смеси (по таймеру).
      3. Найти sites с open green_window в радиусе reachable_km.
      4. Применить transition + записать TruckDispatchLog.
      5. Опубликовать сообщение в WebSocket /ws/dashboard.
    """
    raise NotImplementedError
