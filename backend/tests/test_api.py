"""
API tests for the PayCare FastAPI layer (Phase 2).

Covers: health endpoint, the three demo scenarios through HTTP, and
Pydantic validation failures (HTTP 422).

Run:  python -m pytest backend/tests -v
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from main import app

LOW_PAYLOAD = {
    "amount": 500,
    "amount_to_user_average": 0.8,
    "new_beneficiary": False,
    "beneficiary_age_days": 900,
    "transactions_last_hour": 0,
    "transactions_last_24h": 2,
    "unusual_transaction_time": False,
    "session_change": False,
    "suspicious_context": False,
}

MEDIUM_PAYLOAD = {
    "amount": 15_000,
    "amount_to_user_average": 4.5,
    "new_beneficiary": False,
    "beneficiary_age_days": 300,
    "transactions_last_hour": 3,
    "transactions_last_24h": 6,
    "unusual_transaction_time": True,
    "session_change": False,
    "suspicious_context": False,
}

HIGH_PAYLOAD = {
    "amount": 45_000,
    "amount_to_user_average": 15.0,
    "new_beneficiary": True,
    "beneficiary_age_days": 0,
    "transactions_last_hour": 5,
    "transactions_last_24h": 12,
    "unusual_transaction_time": True,
    "session_change": True,
    "suspicious_context": True,
}


def _client() -> TestClient:
    # Context manager runs the lifespan (loads the trained model).
    with TestClient(app) as client:
        return client


# ---------------------------------------------------------------------------
# 1) Health
# ---------------------------------------------------------------------------


def test_health() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# 2-4) Scenarios through HTTP
# ---------------------------------------------------------------------------


def test_low_scenario_over_http() -> None:
    with TestClient(app) as client:
        response = client.post("/api/assess-payment", json=LOW_PAYLOAD)
    assert response.status_code == 200
    body = response.json()
    assert body["risk_level"] == "LOW"
    assert body["action"] == "PROCEED"
    assert body["reasons"] == []
    assert 0 <= body["risk_score"] <= 100


def test_medium_scenario_over_http() -> None:
    with TestClient(app) as client:
        response = client.post("/api/assess-payment", json=MEDIUM_PAYLOAD)
    assert response.status_code == 200
    body = response.json()
    assert body["risk_level"] == "MEDIUM"
    assert body["action"] == "MONITOR"
    assert 40 <= body["risk_score"] <= 69
    assert len(body["reasons"]) >= 1


def test_high_scenario_over_http() -> None:
    with TestClient(app) as client:
        response = client.post("/api/assess-payment", json=HIGH_PAYLOAD)
    assert response.status_code == 200
    body = response.json()
    assert body["risk_level"] == "HIGH"
    assert body["action"] == "WARN"
    assert body["risk_score"] >= 70
    assert len(body["reasons"]) >= 4
    # Transparency fields from the Phase 1 engine.
    assert 0 <= body["ml_score"] <= 100
    assert 0 <= body["rule_score"] <= 100


# ---------------------------------------------------------------------------
# 5) Validation failures -> HTTP 422
# ---------------------------------------------------------------------------


def test_zero_amount_rejected() -> None:
    payload = dict(LOW_PAYLOAD, amount=0)
    with TestClient(app) as client:
        response = client.post("/api/assess-payment", json=payload)
    assert response.status_code == 422


def test_negative_counter_rejected() -> None:
    payload = dict(LOW_PAYLOAD, transactions_last_24h=-1)
    with TestClient(app) as client:
        response = client.post("/api/assess-payment", json=payload)
    assert response.status_code == 422


def test_missing_field_rejected() -> None:
    payload = dict(HIGH_PAYLOAD)
    del payload["new_beneficiary"]
    with TestClient(app) as client:
        response = client.post("/api/assess-payment", json=payload)
    assert response.status_code == 422


def test_non_boolean_flag_rejected() -> None:
    payload = dict(LOW_PAYLOAD, suspicious_context="yes")
    with TestClient(app) as client:
        response = client.post("/api/assess-payment", json=payload)
    assert response.status_code == 422
