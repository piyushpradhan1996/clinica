import pytest
from fastapi.testclient import TestClient

from app.database import init_db
from app.main import app


@pytest.fixture(autouse=True)
def isolated_database(tmp_path, monkeypatch):
    monkeypatch.setenv("CLINICA_DB_PATH", str(tmp_path / "clinica-test.db"))
    init_db()
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def visit_payload():
    return {
        "patient_name": "Maya Sharma",
        "appointment_date": "2026-07-12",
        "clinician_type": "Primary care",
        "main_concern": "Recurring headaches after long workdays",
        "symptoms": [
            {
                "name": "Headache",
                "severity": 7,
                "started_on": "2026-07-01",
                "frequency": "Most evenings",
                "notes": "Improves after sleep",
            },
            {
                "name": "Eye strain",
                "severity": 5,
                "frequency": "After screen time",
                "notes": "Worse after meetings",
            },
        ],
        "medications": [
            {
                "name": "Ibuprofen",
                "dosage": "200 mg",
                "schedule": "As needed",
                "reason": "Headache relief",
            }
        ],
        "questions": [
            {"text": "Should I track screen time or blood pressure?", "priority": "High"},
            {"text": "When should I follow up?", "priority": "Normal"},
        ],
        "additional_notes": "No recent injury.",
    }
