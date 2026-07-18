"""Application configuration, read from environment with demo-safe defaults."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL = os.environ.get(
    "DATABASE_URL", f"sqlite:///{(BASE_DIR / 'ecomatter.db').as_posix()}"
)
# Managed Postgres (Render, Heroku) hands out plain postgres:// URLs; route
# them through the psycopg 3 driver SQLAlchemy expects.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")

_DEFAULT_JWT_SECRET = "dev-secret-change-me"
JWT_SECRET = os.environ.get("JWT_SECRET", _DEFAULT_JWT_SECRET)
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "1440"))

# Fail fast rather than ship a guessable token secret to production. Local dev and
# tests (ENVIRONMENT unset) keep the convenient default.
if ENVIRONMENT == "production" and JWT_SECRET == _DEFAULT_JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET must be set to a strong, unique value when ENVIRONMENT=production"
    )

STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", BASE_DIR / "storage"))
DATA_DIR = BASE_DIR / "data"

# Firebase project ID (public) enables /auth/firebase token exchange. Empty
# keeps classic email/password auth only (local dev, tests).
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "")

# Optional IBM RXN for Chemistry credentials; local BRICS engine is used when absent.
RXN_API_KEY = os.environ.get("RXN_API_KEY", "")

# Query PubChem for a real novelty check on top candidates. Disable for offline
# runs and tests (set PUBCHEM_NOVELTY=0).
PUBCHEM_NOVELTY_ENABLED = os.environ.get("PUBCHEM_NOVELTY", "1") not in ("0", "false", "False")

# Genetic-algorithm limits (kept small so a run finishes in well under 2 minutes).
GA_POPULATION_SIZE = int(os.environ.get("GA_POPULATION_SIZE", "60"))
GA_GENERATIONS = int(os.environ.get("GA_GENERATIONS", "12"))
GA_MAX_CANDIDATES = int(os.environ.get("GA_MAX_CANDIDATES", "30"))
GA_TIME_BUDGET_SECONDS = int(os.environ.get("GA_TIME_BUDGET_SECONDS", "90"))

CORS_ORIGINS = os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

# Per-IP fixed-window rate limits (requests per minute). Auth endpoints get a
# strict budget (credential stuffing / signup abuse); everything else a generous
# one that normal UI polling never hits. RATE_LIMIT=0 disables (tests).
RATE_LIMIT_ENABLED = os.environ.get("RATE_LIMIT", "1") not in ("0", "false", "False")
RATE_LIMIT_AUTH_PER_MINUTE = int(os.environ.get("RATE_LIMIT_AUTH_PER_MINUTE", "15"))
RATE_LIMIT_GENERAL_PER_MINUTE = int(os.environ.get("RATE_LIMIT_GENERAL_PER_MINUTE", "240"))
