from dataclasses import dataclass


@dataclass(frozen=True)
class MaxTonnageResult:
    t_window_min: int
    t_useful_min: int
    max_tonnage_t: float
    limiting_factor: str
    recommended_order_t: float


def paver_speed_from_plant(plant_capacity_t_h: float, a: float, h: float, rho: float) -> float:
    """Формула 2 техкарты: V = П_абз / (a · h · ρ · 60), м/мин."""
    denom = a * h * rho * 60
    return plant_capacity_t_h / denom if denom else 0.0


def compute_max_tonnage(
    *,
    window_minutes: int,
    delivery_time_min: int,
    cooling_time_min: int,
    plant_capacity_t_h: float,
    lane_width_m: float,
    layer_thickness_m: float,
    mix_density_t_m3: float,
    paver_speed_m_min: float | None = None,
    safety_factor: float = 0.95,
) -> MaxTonnageResult:
    """Расчёт «успеть до дождя».

    Подробности — docs/algorithms.md §2.
    Ответственный за формулу: E1; реализация: P1.
    """
    t_useful_min = max(window_minutes - delivery_time_min - cooling_time_min, 0)
    t_useful_h = t_useful_min / 60

    if paver_speed_m_min is None:
        paver_speed_m_min = paver_speed_from_plant(
            plant_capacity_t_h, lane_width_m, layer_thickness_m, mix_density_t_m3
        )

    by_plant = plant_capacity_t_h * t_useful_h
    by_paver = lane_width_m * layer_thickness_m * mix_density_t_m3 * paver_speed_m_min * t_useful_min
    if by_plant <= by_paver:
        max_t = by_plant
        limiting = "plant_capacity"
    else:
        max_t = by_paver
        limiting = "paver"

    return MaxTonnageResult(
        t_window_min=window_minutes,
        t_useful_min=t_useful_min,
        max_tonnage_t=round(max_t, 2),
        limiting_factor=limiting,
        recommended_order_t=round(max_t * safety_factor, 2),
    )
