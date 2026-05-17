"""ML-эндпоинты: статус моделей и диагностика калибровки."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services.demo.state import demo_state
from app.services.ml.calibrator import get_calibrator, reset_calibrator
from app.services.ml.green_window_predictor import get_predictor, reset_predictor
from app.services.weather.service import get_site_forecast

router = APIRouter()


@router.get("/status")
async def ml_status() -> dict:
    """Возвращает информацию о загруженных ML-моделях."""
    cal = get_calibrator()
    pred = get_predictor()
    return {
        "calibrator": {
            "loaded": cal.is_loaded,
            "model": cal.model_name,
            "description": "Калибровка вероятности и интенсивности осадков (изотон. регрессия / identity).",
        },
        "green_window_predictor": {
            "loaded": pred.is_loaded,
            "method": "ml" if pred.is_loaded else "heuristic",
            "description": "Оценка длительности безосадкового окна (sklearn / эвристика).",
        },
    }


@router.post("/reload")
async def ml_reload() -> dict:
    """Сбросить кэш моделей и перезагрузить артефакты с диска.

    Полезно после переобучения моделей оффлайн-скриптом — без перезапуска API.
    """
    reset_calibrator()
    reset_predictor()
    cal = get_calibrator()
    pred = get_predictor()
    return {
        "reloaded": True,
        "calibrator_loaded": cal.is_loaded,
        "calibrator_model": cal.model_name,
        "green_window_predictor_loaded": pred.is_loaded,
        "green_window_predictor_method": "ml" if pred.is_loaded else "heuristic",
    }


@router.get("/calibration/{site_id}")
async def ml_calibration_diagnostics(site_id: int, hours: int = 6) -> dict:
    """Показать сырые vs калиброванные значения для участка.

    Полезно для отладки: видно, как модель скорректировала прогноз провайдера.
    """
    site = demo_state.site(site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    forecast = await get_site_forecast(
        site_id=site_id,
        lat=site["location"]["lat"],
        lon=site["location"]["lon"],
        hours=max(1, min(24, hours)),
    )
    cal = get_calibrator()
    diagnostics = [
        {
            "valid_at": h.valid_at.isoformat(),
            "source": h.source,
            **{
                "raw_probability": cal.explain(h).raw_probability,
                "calibrated_probability": cal.explain(h).calibrated_probability,
                "raw_precip_mm_h": cal.explain(h).raw_precip_mm_h,
                "calibrated_precip_mm_h": cal.explain(h).calibrated_precip_mm_h,
            },
        }
        for h in forecast
    ]
    return {
        "site_id": site_id,
        "model": cal.model_name,
        "loaded": cal.is_loaded,
        "hours": diagnostics,
    }
