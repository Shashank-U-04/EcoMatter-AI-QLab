"""End-to-end API flow tests against an in-memory app."""
import time


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_auth_required_for_projects(client):
    assert client.get("/projects").status_code == 401


def test_duplicate_signup_rejected(client):
    body = {"name": "A", "email": "dup@example.com", "password": "password123"}
    assert client.post("/auth/signup", json=body).status_code == 201
    assert client.post("/auth/signup", json=body).status_code == 409


def test_full_pipeline(auth_client):
    # Create a project with a target profile.
    resp = auth_client.post(
        "/projects",
        json={
            "name": "Biodegradable film",
            "domain": "packaging",
            "property_targets": [
                {"property_name": "biodegradability", "target_value": 85, "weight": 2.0},
                {"property_name": "thermal_stability", "target_value": 55, "weight": 1.0},
                {"property_name": "lightweight", "target_value": 70, "weight": 1.0},
            ],
        },
    )
    assert resp.status_code == 201, resp.text
    project_id = resp.json()["id"]

    # Kick off generation (runs on a worker thread).
    assert auth_client.post(f"/projects/{project_id}/generate").status_code == 202

    # Poll for completion.
    for _ in range(120):
        run = auth_client.get(f"/projects/{project_id}/runs/latest").json()
        if run["status"] in ("completed", "failed"):
            break
        time.sleep(1)
    assert run["status"] == "completed", run

    candidates = auth_client.get(f"/projects/{project_id}/candidates").json()
    assert len(candidates) > 0
    assert candidates[0]["rank"] == 1

    # Candidate detail includes an explanation.
    cid = candidates[0]["id"]
    detail = auth_client.get(f"/candidates/{cid}").json()
    assert "summary" in detail["explanation"]
    assert len(detail["predictions"]) == 5
    assert detail["project_id"] == project_id
    if len(candidates) > 1:  # rank 1 must point at rank 2
        assert detail["next_candidate_id"] == candidates[1]["id"]

    # 2D image renders.
    img = auth_client.get(f"/candidates/{cid}/image")
    assert img.status_code == 200 and "svg" in img.text[:200].lower()

    # Reports export in all three formats.
    for fmt in ("json", "csv", "pdf"):
        r = auth_client.get(f"/projects/{project_id}/report", params={"format": fmt})
        assert r.status_code == 200, (fmt, r.text[:200])
        assert len(r.content) > 0
