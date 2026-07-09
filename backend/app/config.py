"""Application configuration, read from environment with demo-safe defaults."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL = os.environ.get(
    "DATABASE_URL", f"sqlite:///{(BASE_DIR / 'ecomatter.db').as_posix()}"
)

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "1440"))

STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", BASE_DIR / "storage"))
DATA_DIR = BASE_DIR / "data"

# Optional IBM RXN for Chemistry credentials; local BRICS engine is used when absent.
RXN_API_KEY = os.environ.get("RXN_API_KEY", "")

# Genetic-algorithm limits (kept small so a run finishes in well under 2 minutes).
GA_POPULATION_SIZE = int(os.environ.get("GA_POPULATION_SIZE", "60"))
GA_GENERATIONS = int(os.environ.get("GA_GENERATIONS", "12"))
GA_MAX_CANDIDATES = int(os.environ.get("GA_MAX_CANDIDATES", "30"))
GA_TIME_BUDGET_SECONDS = int(os.environ.get("GA_TIME_BUDGET_SECONDS", "90"))

CORS_ORIGINS = os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")
