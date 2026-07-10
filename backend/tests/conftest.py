"""Shared pytest fixtures: in-memory DB and an authenticated API client."""
import os
import tempfile

# Must be set before any `app` import (config reads it at module load) so the
# whole suite stays offline — no live PubChem calls during tests.
os.environ["PUBCHEM_NOVELTY"] = "0"
# The suite's auth calls would share one fixed rate-limit window; the limiter
# itself is unit-tested in test_rate_limit.py.
os.environ["RATE_LIMIT"] = "0"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture()
def client():
    # Fresh SQLite file per test module run.
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    os.environ["DATABASE_URL"] = f"sqlite:///{path}"

    from app import database

    # File-backed SQLite with the default pool so each thread (the request
    # thread and the generation worker thread) gets its own connection, matching
    # production behavior. A shared single connection would corrupt concurrent
    # transactions.
    test_engine = create_engine(
        f"sqlite:///{path}",
        connect_args={"check_same_thread": False},
    )
    database.engine = test_engine
    database.SessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )

    from app import models  # noqa: F401

    database.Base.metadata.create_all(bind=test_engine)

    # Patch modules that captured SessionLocal at import time.
    from app.services import pipeline

    pipeline.SessionLocal = database.SessionLocal

    from app.main import app

    with TestClient(app) as c:
        yield c

    try:
        os.remove(path)
    except OSError:
        pass


@pytest.fixture()
def auth_client(client):
    resp = client.post(
        "/auth/signup",
        json={"name": "Demo", "email": "demo@example.com", "password": "password123"},
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client
