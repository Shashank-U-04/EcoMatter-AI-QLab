"""EcoMatter AI-QLab — FastAPI application entrypoint."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS, STORAGE_DIR
from .database import Base, apply_schema_patches, engine
from .routers import auth, candidates, projects, reports

logging.basicConfig(level=logging.INFO)

# Import models so create_all sees every table.
from . import models  # noqa: E402,F401

STORAGE_DIR.mkdir(parents=True, exist_ok=True)
Base.metadata.create_all(bind=engine)
apply_schema_patches()

app = FastAPI(
    title="EcoMatter AI-QLab API",
    version="1.0.0",
    description="AI-powered inverse materials design — generation, screening, ranking, retrosynthesis.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(candidates.router)
app.include_router(reports.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "service": "ecomatter-ai-qlab"}
