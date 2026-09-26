"""
Tests for Phase 4: threat-event persistence and dashboard data.

Covers: DB creation, event creation (CANCELLED/CONTINUED), retrieval,
transaction IDs, summary metrics, validation, and persistence across
separate app instances (restart simulation).

Run:  python -m pytest backend/tests -v
"""

from __future__ import annotations

import re
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

import database
from main import app

# Payload shape mirrors the frontend's InterventionCard -> api.createThreatEvent call.
HIGH_EVENT = {
    "risk_score": 99,
    "risk_level": "HIGH",
    "action": "WARN",
    "user_decision": "CANCELLED",
    "ml_score": 98,
    "rule_score": 100,
    "reasons": [
        "New beneficiary",
        "Amount is significantly above normal",
        "High transaction velocity",
    ],
}


@pytest.fixture(autouse=True)
def clean_db(tmp_path):
    """Point the suite at a fresh per-test database for full isolation.

    tmp_path is unique per test, so there is no delete/lock contention
    between tests (Windows file locking makes a shared file flaky).
    """
    database.DB_PATH = str(tmp_path / "test-paycare.db")
    database.init_db()
    yield


def _client() -> TestClient:
    with TestClient(app) as client:
        return client


# ---------------------------------------------------------------------------
# Database layer
# ---------------------------------------------------------------------------


def test_db_created_automatically(tmp_path):
    db_file = tmp_path / "sub" / "fresh.db"
    assert not db_file.exists()
    database.init_db(db_file)
    assert db_file.exists()


def test_event_creation_cancelled():
    stored = database.insert_threat_event({"transaction_id": "TXN-TEST-0001", **HIGH_EVENT})
    assert stored["transaction_id"] == "TXN-TEST-0001"
    assert stored["user_decision"] == "CANCELLED"
    assert stored["reasons"] == HIGH_EVENT["reasons"]


def test_event_creation_continued():
    stored = database.insert_threat_event(
        {"transaction_id": "TXN-TEST-0002", **HIGH_EVENT, "user_decision": "CONTINUED"}
    )
    assert stored["user_decision"] == "CONTINUED"


def test_event_retrieval_newest_first():
    database.insert_threat_event({"transaction_id": "TXN-TEST-0001", **HIGH_EVENT})
    database.insert_threat_event(
        {"transaction_id": "TXN-TEST-0002", **HIGH_EVENT, "user_decision": "CONTINUED"}
    )
    events = database.list_threat_events()
    assert [e["transaction_id"] for e in events] == ["TXN-TEST-0002", "TXN-TEST-0001"]


def test_transaction_id_format_and_sequence():
    id1 = database.next_transaction_id(now=datetime(2026, 9, 25))
    assert re.fullmatch(r"TXN-20260925-\d{4}", id1)
    # After an insert, the per-day sequence advances.
    database.insert_threat_event({"transaction_id": id1, **HIGH_EVENT})
    id2 = database.next_transaction_id(now=datetime(2026, 9, 25))
    assert id2 == "TXN-20260925-0002"


def test_summary_counts():
    database.insert_threat_event({"transaction_id": "TXN-TEST-0001", **HIGH_EVENT})
    database.insert_threat_event(
        {"transaction_id": "TXN-TEST-0002", **HIGH_EVENT, "user_decision": "CONTINUED"}
    )
    summary = database.get_summary()
    assert summary["total_events"] == 2
    assert summary["high_risk_events"] == 2
    assert summary["cancelled"] == 1
    assert summary["continued"] == 1
    assert summary["risk_distribution"] == {"LOW": 0, "MEDIUM": 0, "HIGH": 2}


# ---------------------------------------------------------------------------
# API layer
# ---------------------------------------------------------------------------


def test_api_create_and_list_roundtrip():
    client = _client()
    response = client.post("/api/threat-events", json=HIGH_EVENT)
    assert response.status_code == 200
    created = response.json()
    assert created["transaction_id"].startswith("TXN-")
    assert created["user_decision"] == "CANCELLED"

    listing = client.get("/api/threat-events").json()
    assert [e["transaction_id"] for e in listing["events"]] == [created["transaction_id"]]


def test_api_rejects_medium_risk():
    client = _client()
    payload = dict(HIGH_EVENT, risk_level="MEDIUM")
    response = client.post("/api/threat-events", json=payload)
    assert response.status_code == 422


def test_api_rejects_bad_decision():
    client = _client()
    payload = dict(HIGH_EVENT, user_decision="MAYBE")
    response = client.post("/api/threat-events", json=payload)
    assert response.status_code == 422


def test_api_summary_endpoint():
    client = _client()
    client.post("/api/threat-events", json=HIGH_EVENT)
    client.post("/api/threat-events", json=dict(HIGH_EVENT, user_decision="CONTINUED"))
    response = client.get("/api/threat-events/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["total_events"] == 2
    assert body["cancelled"] == 1
    assert body["continued"] == 1


def test_api_empty_event_list():
    client = _client()
    response = client.get("/api/threat-events")
    assert response.status_code == 200
    assert response.json() == {"events": []}


def test_api_error_shape_has_no_traceback():
    client = _client()
    response = client.post("/api/threat-events", json=dict(HIGH_EVENT, risk_score=10000))
    assert response.status_code == 422
    assert "Traceback" not in response.text


# ---------------------------------------------------------------------------
# Persistence across a simulated restart
# ---------------------------------------------------------------------------


def test_persistence_across_restart():
    # First "process": create an event via the API.
    with TestClient(app) as client:
        created = client.post("/api/threat-events", json=HIGH_EVENT).json()

    # Second "process": a fresh app instance against the same DB file.
    from main import app as fresh_app  # re-imported app object, new lifespan

    with TestClient(fresh_app) as client:
        listing = client.get("/api/threat-events").json()
        summary = client.get("/api/threat-events/summary").json()

    ids = [e["transaction_id"] for e in listing["events"]]
    assert created["transaction_id"] in ids
    assert summary["total_events"] == 1
    assert summary["cancelled"] == 1
