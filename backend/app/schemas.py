"""Pydantic request/response schemas for the PayCare API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PaymentFeaturesRequest(BaseModel):
    """Transaction + context features, matching the Phase 1 feature set.

    Validation mirrors the risk engine's expectations: positive amounts,
    non-negative counters, boolean context flags.
    """

    amount: float = Field(..., gt=0, description="Transaction amount in INR")
    amount_to_user_average: float = Field(
        ..., gt=0, description="Ratio of this amount to the user's average transaction"
    )
    new_beneficiary: bool = Field(
        ..., strict=True, description="Has the user paid this beneficiary before?"
    )
    beneficiary_age_days: int = Field(
        ..., ge=0, description="Days since the beneficiary was added"
    )
    transactions_last_hour: int = Field(..., ge=0, description="Payments sent in the last hour")
    transactions_last_24h: int = Field(..., ge=0, description="Payments sent in the last 24h")
    unusual_transaction_time: bool = Field(
        ..., strict=True, description="Is this an unusual hour for this user?"
    )
    session_change: bool = Field(
        ..., strict=True, description="Was there an abrupt session/app switch?"
    )
    suspicious_context: bool = Field(
        ..., strict=True, description="Any scam-signalling context flag (simulated in the MVP)"
    )


class RiskAssessmentResponse(BaseModel):
    """Hybrid risk result, straight from the Phase 1 engine output."""

    risk_score: int = Field(..., ge=0, le=100, description="Hybrid risk score 0-100")
    risk_level: str = Field(..., description="LOW / MEDIUM / HIGH")
    action: str = Field(..., description="PROCEED / MONITOR / WARN")
    ml_score: int = Field(..., ge=0, le=100, description="ML-probability score component")
    rule_score: int = Field(..., ge=0, le=100, description="Rule-engine score component")
    reasons: list[str] = Field(..., description="Human-readable explanations")
