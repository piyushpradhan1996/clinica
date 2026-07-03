def test_health_check(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "clinica"}


def test_create_visit_generates_brief_and_persists_record(client, visit_payload):
    response = client.post("/api/visits", json=visit_payload)

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert body["brief"]["title"] == "Primary care visit brief for 2026-07-12"
    assert "Most intense symptom: Headache (7/10)" in body["brief"]["key_points"][1]
    assert body["brief"]["questions_for_visit"][0] == "Should I track screen time or blood pressure?"
    assert body["brief"]["readiness"]["score"] == 100
    assert "Questions are ready for the appointment." in body["brief"]["readiness"]["completed_items"]

    list_response = client.get("/api/visits")

    assert list_response.status_code == 200
    assert list_response.json()[0]["patient_name"] == "Maya Sharma"
    assert list_response.json()[0]["symptom_count"] == 2


def test_preview_does_not_persist_visit(client, visit_payload):
    preview_response = client.post("/api/visits/preview", json=visit_payload)
    list_response = client.get("/api/visits")

    assert preview_response.status_code == 200
    assert preview_response.json()["opening_line"].startswith("Maya Sharma is preparing")
    assert list_response.json() == []


def test_visit_export_returns_markdown(client, visit_payload):
    create_response = client.post("/api/visits", json=visit_payload)
    visit_id = create_response.json()["id"]

    export_response = client.get(f"/api/visits/{visit_id}/export")

    assert export_response.status_code == 200
    assert "# Clinica Visit Brief: 2026-07-12" in export_response.text
    assert "## Questions For The Visit" in export_response.text
    assert "Score: 100/100" in export_response.text


def test_validation_rejects_out_of_range_symptom_severity(client, visit_payload):
    visit_payload["symptoms"][0]["severity"] = 12

    response = client.post("/api/visits", json=visit_payload)

    assert response.status_code == 422


def test_urgent_language_gets_safety_boundary(client, visit_payload):
    visit_payload["main_concern"] = "Shortness of breath and chest pain after walking upstairs"

    response = client.post("/api/visits/preview", json=visit_payload)

    assert response.status_code == 200
    assert "Urgent symptom language was detected" in response.json()["safety_note"]


def test_sparse_visit_returns_readiness_gaps(client, visit_payload):
    visit_payload["symptoms"] = []
    visit_payload["medications"] = []
    visit_payload["questions"] = []
    visit_payload["additional_notes"] = ""

    response = client.post("/api/visits/preview", json=visit_payload)

    assert response.status_code == 200
    readiness = response.json()["readiness"]
    assert readiness["score"] == 40
    assert "Add at least one symptom or concern detail." in readiness["missing_items"]
    assert "Add the questions that should be answered before leaving." in readiness["missing_items"]
