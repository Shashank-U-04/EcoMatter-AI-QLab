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


def test_project_input_validation(auth_client):
    def create(targets):
        return auth_client.post(
            "/projects",
            json={"name": "Validation", "domain": "packaging", "property_targets": targets},
        )

    # Unknown property key.
    assert create([{"property_name": "magicness", "target_value": 50}]).status_code == 422
    # Duplicate property keys.
    assert (
        create(
            [
                {"property_name": "biodegradability", "target_value": 50},
                {"property_name": "biodegradability", "target_value": 70},
            ]
        ).status_code
        == 422
    )
    # Empty target list.
    assert create([]).status_code == 422
    # Blank-after-strip project name.
    resp = auth_client.post(
        "/projects",
        json={
            "name": "   ",
            "domain": "packaging",
            "property_targets": [{"property_name": "biodegradability", "target_value": 50}],
        },
    )
    assert resp.status_code == 422


def test_change_password(auth_client):
    # Wrong current password is rejected without changing anything.
    r = auth_client.post(
        "/auth/change-password",
        json={"current_password": "wrong-password", "new_password": "newpassword456"},
    )
    assert r.status_code == 400
    # Correct current password rotates the hash.
    r = auth_client.post(
        "/auth/change-password",
        json={"current_password": "password123", "new_password": "newpassword456"},
    )
    assert r.status_code == 204
    # Old credential dies, new one works.
    login = {"email": "demo@example.com", "password": "password123"}
    assert auth_client.post("/auth/login", json=login).status_code == 401
    login["password"] = "newpassword456"
    assert auth_client.post("/auth/login", json=login).status_code == 200


def test_reference_library(client):
    molecules = client.get("/meta/reference-library").json()["molecules"]
    assert len(molecules) == 30
    first = molecules[0]
    assert first["name"] and first["formula"] and first["smiles"]
    assert first["mol_weight"] > 0
    assert first["svg"] and "<svg" in first["svg"]


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

    # Run telemetry was recorded and the run history lists it.
    assert run["progress_total"] > 0
    assert run["progress_best_fitness"] > 0
    # Per-generation trace feeds the fitness-evolution chart. The GA reports a
    # gen-0 baseline for the initial population, then one point per generation.
    assert len(run["progress_history"]) == run["progress_generation"] + 1
    first_point = run["progress_history"][0]
    assert first_point["gen"] == 0 and first_point["best"] > 0 and first_point["valid"] > 0
    assert run["progress_history"][-1]["gen"] == run["progress_generation"]
    history = auth_client.get(f"/projects/{project_id}/runs").json()
    assert len(history) == 1 and history[0]["status"] == "completed"

    # Starring toggles on and off and shows up in the list.
    assert auth_client.patch(f"/candidates/{cid}/star").json()["starred"] is True
    starred_list = auth_client.get(f"/projects/{project_id}/candidates").json()
    assert next(c for c in starred_list if c["id"] == cid)["starred"] is True
    assert auth_client.patch(f"/candidates/{cid}/star").json()["starred"] is False

    # Share link: mint, read publicly, then revoke → 404.
    share_token = auth_client.post(f"/projects/{project_id}/share").json()["share_token"]
    assert share_token
    # Minting again returns the same token (idempotent).
    assert auth_client.post(f"/projects/{project_id}/share").json()["share_token"] == share_token
    shared = auth_client.get(f"/share/{share_token}", headers={"Authorization": ""})
    assert shared.status_code == 200
    body = shared.json()
    assert body["name"] and len(body["candidates"]) == len(candidates)
    assert body["run"]["status"] == "completed"
    assert auth_client.delete(f"/projects/{project_id}/share").json()["share_token"] is None
    assert auth_client.get(f"/share/{share_token}").status_code == 404

    # Rename then delete the project; everything under it disappears.
    renamed = auth_client.patch(f"/projects/{project_id}", json={"name": "Renamed film"})
    assert renamed.json()["name"] == "Renamed film"
    assert auth_client.delete(f"/projects/{project_id}").status_code == 204
    assert auth_client.get(f"/projects/{project_id}").status_code == 404
    assert auth_client.get(f"/candidates/{cid}").status_code == 404
