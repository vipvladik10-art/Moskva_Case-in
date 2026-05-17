"""Правила автоматической генерации заявок на технические смеси.

См. docs/algorithms.md §7. Ответственный: P1, нормативка: E1.
"""

from dataclasses import dataclass

from app.schemas.weather import HourlyForecast


@dataclass
class SupplySuggestion:
    item: str
    quantity: float
    unit: str
    reason: str


def suggest_supplies(forecast_24h: list[HourlyForecast]) -> list[SupplySuggestion]:
    suggestions: list[SupplySuggestion] = []
    if any(h.temp_c < 0 for h in forecast_24h):
        suggestions.append(
            SupplySuggestion(
                item="antifreeze",
                quantity=200.0,
                unit="l",
                reason="frost_forecast_24h",
            )
        )
    if any(h.precip_mm_h > 0 for h in forecast_24h):
        suggestions.append(
            SupplySuggestion(
                item="kerosene",
                quantity=50.0,
                unit="l",
                reason="anti_adhesion_for_paver",
            )
        )
    return suggestions
