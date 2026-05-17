from math import asin, cos, radians, sin, sqrt

EARTH_R_KM = 6371.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Расстояние по большому кругу, км. Используется до подключения PostGIS."""
    rlat1, rlat2 = radians(lat1), radians(lat2)
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(rlat1) * cos(rlat2) * sin(dlon / 2) ** 2
    return 2 * EARTH_R_KM * asin(sqrt(a))


def delivery_time_minutes(
    distance_km: float,
    *,
    avg_speed_kmh: float = 60.0,
    order_lead_time_hours: float = 4.0,
    load_buffer_min: int = 15,
) -> int:
    """t_дост = max(заказ_АБЗ, расстояние/скорость) + буфер."""
    travel_min = (distance_km / avg_speed_kmh) * 60
    lead_min = order_lead_time_hours * 60
    return int(round(max(travel_min, lead_min) + load_buffer_min))
