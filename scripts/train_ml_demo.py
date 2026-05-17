"""Write deterministic demo ML artifacts for local demos.

The script does not need a database. It stores small importable models with a
sklearn-like predict() method in the format expected by the backend.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import joblib


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

DEFAULT_MODELS_DIR = REPO_ROOT / "data" / "models"


def train_calibrator(models_dir: Path) -> Path:
    """Write a monotonic probability calibrator for precipitation POP."""
    from app.ml_demo_models import DemoProbabilityCalibrator

    path = models_dir / "calibrator.joblib"
    joblib.dump({"model": DemoProbabilityCalibrator(), "name": "demo_probability_calibrator_v1"}, path)
    return path


def train_green_window_predictor(models_dir: Path) -> Path:
    """Write a deterministic regressor for green-window duration."""
    from app.ml_demo_models import DemoGreenWindowRegressor

    path = models_dir / "green_window_predictor.joblib"
    joblib.dump({"model": DemoGreenWindowRegressor(), "name": "demo_green_window_regressor_v1"}, path)
    return path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train demo ML joblib artifacts.")
    parser.add_argument(
        "--models-dir",
        type=Path,
        default=DEFAULT_MODELS_DIR,
        help="Directory for calibrator.joblib and green_window_predictor.joblib.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    models_dir = args.models_dir.expanduser().resolve()
    models_dir.mkdir(parents=True, exist_ok=True)

    calibrator_path = train_calibrator(models_dir)
    predictor_path = train_green_window_predictor(models_dir)

    print(f"Wrote {calibrator_path}")
    print(f"Wrote {predictor_path}")


if __name__ == "__main__":
    main()
