"""Триггер планирования ТО при подтверждении непогоды.

См. docs/algorithms.md §6. Ответственный: P1, требования: E1.
"""


async def schedule_maintenance_for_idle_machines(site_id: int) -> list[int]:
    """TODO(P1, спринт 3): при precipitation_detected(site)
    найти простаивающие машины в радиусе и создать MaintenanceTask.

    Возвращает список идентификаторов созданных задач.
    """
    raise NotImplementedError
