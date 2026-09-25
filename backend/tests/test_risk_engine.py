"""
Tests for the PayCare Phase 1 risk engine.

Covers: dataset generation, model artifact, rule engine, hybrid engine
response structure, and the three demo scenarios (LOW / MEDIUM / HIGH).

Run:  python -m pytest backend/tests -v
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from dataset import FEATURES, generate_dataset
from risk_engine import RiskInputError, assess_payment
from rules import evaluate_rules

MODEL_PATH = Path(__file__).resolve().parents[1] / "ml" / "model.pkl"

LOW_PAYLOAD = {
    "amount": 500,
    "amount_to_user_average": 0.8,
    "new_beneficiary": 0,
    "beneficiary_age_days": 900,
    "transactions_last_hour": 0,
    "transactions_last_24h": 2,
    "unusual_transaction_time": 0,
    "session_change": 0,
    "suspicious_context": 0,
}

MEDIUM_PAYLOAD = {
    "amount": 15_000,
    "amount_to_user_average": 4.5,
    "new_beneficiary": 0,
    "beneficiary_age_days": 300,
    "transactions_last_hour": 3,
    "transactions_last_24h": 6,
    "unusual_transaction_time": 1,
    "session_change": 0,
    "suspicious_context": 0,
}

HIGH_PAYLOAD = {
    "amount": 45_000,
    "amount_to_user_average": 15.0,
    "new_beneficiary": 1,
    "beneficiary_age_days": 0,
    "transactions_last_hour": 5,
    "transactions_last_24h": 12,
    "unusual_transaction_time": 1,
    "session_change": 1,
    "suspicious_context": 1,
}


# ---------------------------------------------------------------------------
# 1) Dataset generation
# ---------------------------------------------------------------------------


def test_dataset_generation() -> None:
    df = generate_dataset(n_rows=500, seed=7)
    assert len(df) == 500
    assert list(df.columns) == FEATURES + ["risky"]
    assert df["risky"].isin([0, 1]).all()
    # Both classes present so training is meaningful.
    assert 0 < df["risky"].mean() < 1
    # Reproducible with the same seed.
    df2 = generate_dataset(n_rows=500, seed=7)
    assert df.equals(df2)


# ---------------------------------------------------------------------------
# 2) Model artifact
# ---------------------------------------------------------------------------


def test_model_exists() -> None:
    assert MODEL_PATH.exists(), "model.pkl missing; run `python backend/ml/train.py` first."


def test_model_loads_and_predicts() -> None:
    import joblib

    model = joblib.load(MODEL_PATH)
    proba = model.predict_proba(pd.DataFrame([LOW_PAYLOAD])[FEATURES])[0]
    assert 0.0 <= float(proba[1]) <= 1.0


# ---------------------------------------------------------------------------
# 3) Rule engine
# ---------------------------------------------------------------------------


def test_rule_engine_clean_input() -> None:
    result = evaluate_rules(LOW_PAYLOAD)
    assert result["rule_score"] == 0
    assert result["reasons"] == []


def test_rule_engine_high_input() -> None:
    result = evaluate_rules(HIGH_PAYLOAD)
    assert result["rule_score"] >= 70
    assert "New beneficiary" in result["reasons"]
    assert "Amount is significantly above normal" in result["reasons"]
    assert "High transaction velocity" in result["reasons"]
    assert "Suspicious contextual signal" in result["reasons"]


# ---------------------------------------------------------------------------
# 4) Hybrid engine response structure
# ---------------------------------------------------------------------------


def test_assess_payment_response_structure() -> None:
    result = assess_payment(HIGH_PAYLOAD)
    assert set(result) >= {"risk_score", "risk_level", "action", "reasons"}
    assert isinstance(result["risk_score"], int)
    assert 0 <= result["risk_score"] <= 100
    assert result["risk_level"] in {"LOW", "MEDIUM", "HIGH"}
    assert result["action"] in {"PROCEED", "MONITOR", "WARN"}
    assert isinstance(result["reasons"], list)
    assert all(isinstance(r, str) and r for r in result["reasons"])


# ---------------------------------------------------------------------------
# 5-7) The three scenarios land in their intended bands
# ---------------------------------------------------------------------------


def test_low_scenario() -> None:
    result = assess_payment(LOW_PAYLOAD)
    assert result["risk_level"] == "LOW"
    assert result["action"] == "PROCEED"
    assert result["risk_score"] <= 39
    assert result["reasons"] == []


def test_medium_scenario() -> None:
    result = assess_payment(MEDIUM_PAYLOAD)
    assert result["risk_level"] == "MEDIUM"
    assert result["action"] == "MONITOR"
    assert 40 <= result["risk_score"] <= 69  # band sanity
    assert len(result["reasons"]) >= 1  # explains what looked unusual


def test_high_scenario() -> None:
    result = assess_payment(HIGH_PAYLOAD)
    assert result["risk_level"] == "HIGH"
    assert result["action"] == "WARN"
    assert result["risk_score"] >= 70
    assert len(result["reasons"]) >= 4


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------


def test_missing_field_raises() -> None:
    payload = dict(HIGH_PAYLOAD)
    del payload["amount"]
    with pytest.raises(RiskInputError):
        assess_payment(payload)


def test_negative_amount_raises() -> None:
    payload = dict(LOW_PAYLOAD)
    payload["amount"] = -5
    with pytest.raises(RiskInputError):
        assess_payment(payload)


def test_non_numeric_field_raises() -> None:
    payload = dict(LOW_PAYLOAD)
    payload["amount"] = "lots"
    with pytest.raises(RiskInputError):
        assess_payment(payload)
