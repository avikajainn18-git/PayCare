"""
Hybrid risk engine for the PayCare MVP.

Combines a deterministic rule score with an XGBoost ML probability:

    Final Score = 0.6 x (ML probability x 100) + 0.4 x Rule Score

Risk bands: 0-39 LOW, 40-69 MEDIUM, 70-100 HIGH.
Actions:    LOW -> PROCEED, MEDIUM -> MONITOR, HIGH -> WARN.

The engine is deliberately framework-free (no FastAPI here) so Phase 2
can import `assess_payment` directly from the API layer.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from rules import evaluate_rules

MODEL_PATH = Path(__file__).with_name("model.pkl")

# Weights and bands (single place to tune).
W_ML = 0.6
W_RULE = 0.4
LOW_MAX = 39
MEDIUM_MAX = 69

ACTION_PROCEED = "PROCEED"
ACTION_MONITOR = "MONITOR"
ACTION_WARN = "WARN"

_LEVEL_TO_ACTION = {
    "LOW": ACTION_PROCEED,
    "MEDIUM": ACTION_MONITOR,
    "HIGH": ACTION_WARN,
}

_FEATURE_KEYS = (
    "amount",
    "amount_to_user_average",
    "new_beneficiary",
    "beneficiary_age_days",
    "transactions_last_hour",
    "transactions_last_24h",
    "unusual_transaction_time",
    "session_change",
    "suspicious_context",
)

_BOOL_KEYS = ("new_beneficiary", "unusual_transaction_time", "session_change", "suspicious_context")


class RiskInputError(ValueError):
    """Raised when the incoming feature dict is missing or has invalid fields."""


def _normalize_features(payload: dict[str, Any]) -> dict[str, Any]:
    """Validate and coerce raw input into the model's feature schema."""
    if not isinstance(payload, dict):
        raise RiskInputError("Input must be a dict of transaction/context features.")

    missing = [key for key in _FEATURE_KEYS if key not in payload]
    if missing:
        raise RiskInputError(f"Missing required field(s): {', '.join(missing)}")

    normalized: dict[str, Any] = {}
    for key in _FEATURE_KEYS:
        value = payload[key]
        try:
            normalized[key] = int(bool(value)) if key in _BOOL_KEYS else float(value)
        except (TypeError, ValueError):
            raise RiskInputError(f"Field '{key}' must be numeric.") from None

    if normalized["amount"] <= 0:
        raise RiskInputError("Field 'amount' must be greater than zero.")
    if normalized["amount_to_user_average"] <= 0:
        raise RiskInputError("Field 'amount_to_user_average' must be greater than zero.")
    for key in ("beneficiary_age_days", "transactions_last_hour", "transactions_last_24h"):
        if normalized[key] < 0:
            raise RiskInputError(f"Field '{key}' cannot be negative.")
    return normalized


def _load_model(model_path: Path = MODEL_PATH):
    """Load the trained XGBoost model (joblib)."""
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model artifact not found at {model_path}. Run `python backend/ml/train.py` first."
        )
    return joblib.load(model_path)


def risk_level(score: int) -> str:
    """Map a 0-100 score to its risk band."""
    if score <= LOW_MAX:
        return "LOW"
    if score <= MEDIUM_MAX:
        return "MEDIUM"
    return "HIGH"


def assess_payment(payload: dict[str, Any], model: Any = None) -> dict[str, Any]:
    """Full pipeline: validate -> rules -> ML -> hybrid score -> decision.

    Returns a dict with risk_score, risk_level, action, reasons (plus
    the underlying ml_score and rule_score for transparency/debugging).
    """
    features = _normalize_features(payload)

    # 1) Deterministic rules -> score + human-readable reasons.
    rule_result = evaluate_rules(features)
    rule_score: int = rule_result["rule_score"]

    # 2) ML probability -> ML score on the same 0-100 scale.
    if model is None:
        model = _load_model()
    features_df = pd.DataFrame([features])[list(_FEATURE_KEYS)]
    probability = float(model.predict_proba(features_df)[0][1])

    # 3) Hybrid score.
    final_score = int(round(W_ML * probability * 100 + W_RULE * rule_score))

    # 4) Level + action.
    level = risk_level(final_score)
    return {
        "risk_score": final_score,
        "risk_level": level,
        "action": _LEVEL_TO_ACTION[level],
        "reasons": rule_result["reasons"],
        "ml_score": round(probability * 100),
        "rule_score": rule_score,
    }
