"""Shared paths for optional ML model artifacts."""

from __future__ import annotations

from pathlib import Path

from app.core.config import settings


def models_dir() -> Path:
    """Return the directory with joblib artifacts for the current environment."""
    if settings.ml_models_dir:
        return Path(settings.ml_models_dir).expanduser().resolve()

    backend_root = Path(__file__).resolve().parents[3]
    repo_models = backend_root.parent / "data" / "models"
    if repo_models.exists():
        return repo_models
    return backend_root / "data" / "models"
