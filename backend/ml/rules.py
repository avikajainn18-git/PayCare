"""
Deterministic rule engine for the PayCare MVP.

Rules encode known, explainable scam patterns (e.g. "new beneficiary +
unusually large amount"). Every fired rule produces a human-readable
reason so the intervention screen can explain itself.

The rule score is a 0-100 point accumulation, intentionally transparent
so a hackathon team can tune weights in one place.
"""

from __future__ import annotations

from typing import Any

# Rule weights (points added to the rule score when the condition fires).
W_NEW_BENEFICIARY = 20
W_AMOUNT_VS_AVERAGE = 25
W_AMOUNT_ABSOLUTE = 10
W_VELOCITY = 25
W_UNUSUAL_TIME = 10
W_SESSION_CHANGE = 10
W_SUSPICIOUS_CONTEXT = 30
W_COMBINATION_BONUS = 25

# Thresholds.
AMOUNT_AVERAGE_RATIO_THRESHOLD = 4.0  # amount >= 4x user's average
AMOUNT_ABSOLUTE_THRESHOLD = 40_000  # large absolute payment (INR)
TX_LAST_HOUR_THRESHOLD = 3  # velocity: payments in the last hour
TX_LAST_24H_THRESHOLD = 10  # velocity: payments in the last 24h

# Reason strings (used both by the rule engine and the demo/tests).
R_NEW_BENEFICIARY = "New beneficiary"
R_AMOUNT_ABOVE_NORMAL = "Amount is significantly above normal"
R_LARGE_ABSOLUTE_AMOUNT = "Large transaction amount"
R_HIGH_VELOCITY = "High transaction velocity"
R_UNUSUAL_TIME = "Unusual transaction time"
R_SESSION_CHANGE = "Session change detected"
R_SUSPICIOUS_CONTEXT = "Suspicious contextual signal"
R_COMBINATION = "Classic scam pattern: new beneficiary + high amount + suspicious context"


def _clamp_score(score: float) -> int:
    return int(max(0, min(100, round(score))))


def evaluate_rules(features: dict[str, Any]) -> dict[str, Any]:
    """Evaluate deterministic rules against transaction/context features.

    Returns {"rule_score": int 0-100, "reasons": list[str]}.
    """
    amount = float(features["amount"])
    ratio = float(features["amount_to_user_average"])
    new_beneficiary = bool(features["new_beneficiary"])
    tx_last_hour = int(features["transactions_last_hour"])
    tx_last_24h = int(features["transactions_last_24h"])
    unusual_time = bool(features["unusual_transaction_time"])
    session_change = bool(features["session_change"])
    suspicious_context = bool(features["suspicious_context"])

    score = 0.0
    reasons: list[str] = []

    if new_beneficiary:
        score += W_NEW_BENEFICIARY
        reasons.append(R_NEW_BENEFICIARY)

    if ratio >= AMOUNT_AVERAGE_RATIO_THRESHOLD:
        score += W_AMOUNT_VS_AVERAGE
        reasons.append(R_AMOUNT_ABOVE_NORMAL)

    if amount >= AMOUNT_ABSOLUTE_THRESHOLD:
        score += W_AMOUNT_ABSOLUTE
        reasons.append(R_LARGE_ABSOLUTE_AMOUNT)

    if tx_last_hour >= TX_LAST_HOUR_THRESHOLD or tx_last_24h >= TX_LAST_24H_THRESHOLD:
        score += W_VELOCITY
        reasons.append(R_HIGH_VELOCITY)

    if unusual_time:
        score += W_UNUSUAL_TIME
        reasons.append(R_UNUSUAL_TIME)

    if session_change:
        score += W_SESSION_CHANGE
        reasons.append(R_SESSION_CHANGE)

    if suspicious_context:
        score += W_SUSPICIOUS_CONTEXT
        reasons.append(R_SUSPICIOUS_CONTEXT)

    # Strong combined condition: the classic scam signature.
    if new_beneficiary and ratio >= AMOUNT_AVERAGE_RATIO_THRESHOLD and suspicious_context:
        score += W_COMBINATION_BONUS
        reasons.append(R_COMBINATION)

    return {"rule_score": _clamp_score(score), "reasons": reasons}
