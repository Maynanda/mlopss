from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    APP_NAME: str = "MLOps Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database — swap to postgres URL when ready
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/mlops.db"

    # Storage
    DATASETS_DIR: Path = BASE_DIR / "storage" / "datasets"
    ARTIFACTS_DIR: Path = BASE_DIR / "storage" / "artifacts"

    # MLflow
    MLFLOW_TRACKING_URI: str = "http://localhost:5001"

    # CORS origins (frontend dev server)
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    class Config:
        env_file = ".env"


settings = Settings()

# Ensure storage dirs exist on import
settings.DATASETS_DIR.mkdir(parents=True, exist_ok=True)
settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
(BASE_DIR / "mlflow_tracking").mkdir(parents=True, exist_ok=True)
