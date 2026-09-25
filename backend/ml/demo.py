"""
PayCare risk engine demo: runs the three deterministic MVP scenarios.

Run:  python backend/ml/demo.py
"""

from __future__ import annotations

from risk_engine import assess_payment

SCENARIOS: list[tuple[str, str, dict]] = [
    (
        "LOW RISK SCENARIO",
        # Everyday payment: small amount, known beneficiary, calm behaviour.
        {
            "amount": 500,
            "amount_to_user_average": 0.8,
            "new_beneficiary": 0,
            "beneficiary_age_days": 900,
            "transactions_last_hour": 0,
            "transactions_last_24h": 2,
            "unusual_transaction_time": 0,
            "session_change": 0,
            "suspicious_context": 0,
        },
    ),
    (
        "MEDIUM RISK SCENARIO",
        # Known beneficiary, no suspicious context — but three unusual
        # factors: amount is ~4.5x the user's average, 3 transactions in
        # the last hour, and an unusual transaction hour.
        {
            "amount": 15_000,
            "amount_to_user_average": 4.5,
            "new_beneficiary": 0,
            "beneficiary_age_days": 300,
            "transactions_last_hour": 3,
            "transactions_last_24h": 6,
            "unusual_transaction_time": 1,
            "session_change": 0,
            "suspicious_context": 0,
        },
    ),
    (
        "HIGH RISK SCENARIO",
        # Classic scam signature: new beneficiary, large amount far above
        # normal, velocity spike, unusual time, session change, suspicious
        # context.
        {
            "amount": 45_000,
            "amount_to_user_average": 15.0,
            "new_beneficiary": 1,
            "beneficiary_age_days": 0,
            "transactions_last_hour": 5,
            "transactions_last_24h": 12,
            "unusual_transaction_time": 1,
            "session_change": 1,
            "suspicious_context": 1,
        },
    ),
]


def main() -> None:
    print("=" * 40)
    print("PAYCARE RISK ENGINE DEMO")
    print("=" * 40)
    for title, payload in SCENARIOS:
        result = assess_payment(payload)
        print(f"\n{title}")
        print(f"Risk Score: {result['risk_score']}/100")
        print(f"Risk Level: {result['risk_level']}")
        print(f"Action:     {result['action']}")
        print("Reasons:")
        for reason in result["reasons"]:
            print(f"- {reason}")
        print("-" * 40)
    print("\nDone.")


if __name__ == "__main__":
    main()
