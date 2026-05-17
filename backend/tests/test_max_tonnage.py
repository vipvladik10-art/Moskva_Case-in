from app.services.algorithms.max_tonnage import compute_max_tonnage, paver_speed_from_plant


def test_example_from_docs_algorithms():
    """Кейс из docs/algorithms.md §2 — должен совпадать."""
    res = compute_max_tonnage(
        window_minutes=240,
        delivery_time_min=45,
        cooling_time_min=48,
        plant_capacity_t_h=60,
        lane_width_m=4.0,
        layer_thickness_m=0.05,
        mix_density_t_m3=2.4,
    )
    assert res.t_useful_min == 147
    assert res.limiting_factor in {"plant_capacity", "paver"}
    assert res.max_tonnage_t > 0
    assert res.recommended_order_t < res.max_tonnage_t


def test_paver_speed_formula():
    """Формула 2: V = П_абз / (a · h · ρ · 60)."""
    v = paver_speed_from_plant(plant_capacity_t_h=60, a=4.0, h=0.05, rho=2.4)
    assert round(v, 3) == round(60 / (4.0 * 0.05 * 2.4 * 60), 3)
