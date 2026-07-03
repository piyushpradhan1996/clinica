from datetime import date, timedelta


def test_health_check(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "clinica"}


def test_create_visit_generates_brief_and_persists_record(client, visit_payload):
    response = client.post("/api/visits", json=visit_payload)

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert body["brief"]["title"] == f"Primary care visit brief for {visit_payload['appointment_date']}"
    assert "Most intense symptom: Headache (7/10)" in body["brief"]["key_points"][1]
    assert body["brief"]["questions_for_visit"][0] == "Should I track screen time or blood pressure?"
    assert body["brief"]["readiness"]["score"] == 100
    assert "Questions are ready for the appointment." in body["brief"]["readiness"]["completed_items"]
    assert body["brief"]["readiness"]["rules"][0]["key"] == "main_concern"
    assert body["brief"]["safety_flags"] == []

    list_response = client.get("/api/visits")

    assert list_response.status_code == 200
    assert list_response.json()[0]["patient_name"] == "Maya Sharma"
    assert list_response.json()[0]["symptom_count"] == 2
    assert list_response.json()[0]["readiness_score"] == 100


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
    assert f"# Clinica Visit Brief: {visit_payload['appointment_date']}" in export_response.text
    assert "## Questions For The Visit" in export_response.text
    assert "Score: 100/100" in export_response.text
    assert "Safety flags:\n- None detected" in export_response.text


def test_validation_rejects_out_of_range_symptom_severity(client, visit_payload):
    visit_payload["symptoms"][0]["severity"] = 12

    response = client.post("/api/visits", json=visit_payload)

    assert response.status_code == 422


def test_urgent_language_gets_safety_boundary(client, visit_payload):
    visit_payload["main_concern"] = "Shortness of breath and chest pain after walking upstairs"

    response = client.post("/api/visits/preview", json=visit_payload)

    assert response.status_code == 200
    assert "Urgent symptom language was detected" in response.json()["safety_note"]
    assert "shortness of breath" in response.json()["safety_flags"]
    assert "chest pain" in response.json()["safety_flags"]


def test_negated_urgent_language_does_not_trigger_safety_boundary(client, visit_payload):
    visit_payload["main_concern"] = "Cough for two days with no chest pain and no shortness of breath"

    response = client.post("/api/visits/preview", json=visit_payload)

    assert response.status_code == 200
    assert "Urgent symptom language was detected" not in response.json()["safety_note"]
    assert response.json()["safety_flags"] == []


def test_sparse_visit_returns_readiness_gaps(client, visit_payload):
    visit_payload["symptoms"] = []
    visit_payload["medications"] = []
    visit_payload["questions"] = []
    visit_payload["additional_notes"] = ""

    response = client.post("/api/visits/preview", json=visit_payload)

    assert response.status_code == 200
    readiness = response.json()["readiness"]
    assert readiness["score"] == 35
    assert "Add at least one symptom or concern detail." in readiness["missing_items"]
    assert "Add the questions that should be answered before leaving." in readiness["missing_items"]


def test_missing_medication_dosage_adds_readiness_gap(client, visit_payload):
    visit_payload["medications"][0]["dosage"] = ""

    response = client.post("/api/visits/preview", json=visit_payload)

    assert response.status_code == 200
    readiness = response.json()["readiness"]
    assert readiness["score"] == 95
    assert "Add dosage details for each listed medication." in readiness["missing_items"]


def test_duplicate_questions_are_collapsed(client, visit_payload):
    visit_payload["questions"].append(
        {"text": "Should I track screen time or blood pressure?", "priority": "Low"}
    )

    response = client.post("/api/visits", json=visit_payload)

    assert response.status_code == 201
    questions = response.json()["payload"]["questions"]
    assert len(questions) == 2


def test_future_symptom_start_date_is_rejected(client, visit_payload):
    visit_payload["symptoms"][0]["started_on"] = (date.today() + timedelta(days=1)).isoformat()

    response = client.post("/api/visits", json=visit_payload)

    assert response.status_code == 422


def test_old_appointment_date_is_rejected(client, visit_payload):
    visit_payload["appointment_date"] = (date.today() - timedelta(days=366)).isoformat()

    response = client.post("/api/visits", json=visit_payload)

    assert response.status_code == 422


def test_visit_search_update_duplicate_and_delete(client, visit_payload):
    create_response = client.post("/api/visits", json=visit_payload)
    visit_id = create_response.json()["id"]

    search_response = client.get("/api/visits", params={"search": "maya"})
    assert search_response.status_code == 200
    assert [visit["id"] for visit in search_response.json()] == [visit_id]

    visit_payload["main_concern"] = "Recurring headaches with neck tension"
    update_response = client.put(f"/api/visits/{visit_id}", json=visit_payload)
    assert update_response.status_code == 200
    assert update_response.json()["payload"]["main_concern"] == "Recurring headaches with neck tension"

    duplicate_response = client.post(f"/api/visits/{visit_id}/duplicate")
    assert duplicate_response.status_code == 201
    assert duplicate_response.json()["id"] != visit_id

    delete_response = client.delete(f"/api/visits/{visit_id}")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"deleted_count": 1}


def test_clear_visits_and_privacy_status(client, visit_payload):
    client.post("/api/visits", json=visit_payload)

    privacy_response = client.get("/api/privacy")
    assert privacy_response.status_code == 200
    assert privacy_response.json()["analytics_enabled"] is False
    assert privacy_response.json()["external_api_calls"] is False

    clear_response = client.delete("/api/visits")
    assert clear_response.status_code == 200
    assert clear_response.json() == {"deleted_count": 1}
    assert client.get("/api/visits").json() == []
