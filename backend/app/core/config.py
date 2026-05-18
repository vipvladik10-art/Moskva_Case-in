from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "dev"
    app_port: int = 8000
    app_log_level: str = "INFO"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"]
    )

    database_url: str = "postgresql+asyncpg://asphalt:asphalt@db:5432/asphalt"
    redis_url: str = "redis://redis:6379/0"

    openweather_api_key: str = ""
    tomorrowio_api_key: str = ""
    gismeteo_api_key: str = ""

    green_window_precip_threshold: float = 0.3
    green_window_min_temp_c: float = 5.0
    green_window_min_temp_thin_layer_c: float = 10.0

    ml_models_dir: str = ""

    order_lead_time_hours: float = 4.0

    auth_enabled: bool = True
    admin_api_token: str = "dev-admin-token"
    viewer_api_token: str = "dev-viewer-token"

    auto_maintenance_from_forecast: bool = True
    maintenance_forecast_interval_sec: int = 300


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
