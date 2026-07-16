"""Tests for the /auth/firebase token-exchange endpoint (verification mocked)."""


def _fake_claims(email="fb-user@example.com", name="Firebase User"):
    return {"sub": "firebase-uid-123", "email": email, "name": name}


def test_firebase_login_unconfigured_returns_503(client):
    resp = client.post("/auth/firebase", json={"id_token": "anything"})
    assert resp.status_code == 503


def test_firebase_login_creates_user_and_returns_session(client, monkeypatch):
    from app.routers import auth as auth_router

    monkeypatch.setattr(auth_router, "verify_firebase_token", lambda t: _fake_claims())
    resp = client.post("/auth/firebase", json={"id_token": "valid-token"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["access_token"]
    assert body["name"] == "Firebase User"

    # Session token works against a protected endpoint.
    projects = client.get(
        "/projects", headers={"Authorization": f"Bearer {body['access_token']}"}
    )
    assert projects.status_code == 200


def test_firebase_login_is_idempotent_for_existing_user(client, monkeypatch):
    from app.routers import auth as auth_router

    monkeypatch.setattr(auth_router, "verify_firebase_token", lambda t: _fake_claims())
    first = client.post("/auth/firebase", json={"id_token": "t1"}).json()
    second = client.post("/auth/firebase", json={"id_token": "t2"}).json()
    assert first["user_id"] == second["user_id"]


def test_firebase_login_signup_name_wins_over_token_claim(client, monkeypatch):
    from app.routers import auth as auth_router

    monkeypatch.setattr(auth_router, "verify_firebase_token", lambda t: _fake_claims())
    resp = client.post(
        "/auth/firebase",
        json={"id_token": "t", "name": "Chosen Name", "org": "QLab"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Chosen Name"


def test_firebase_login_rejects_invalid_token_shape(client):
    resp = client.post("/auth/firebase", json={"id_token": ""})
    assert resp.status_code == 422
