"""
Synthetic dataset generator for the PayCare MVP risk model.

The dataset is synthetic and is used only for PayCare MVP prototype
validation. Production deployment would require real historical
bank/PSP transaction data.

Labels are produced from predefined risk patterns plus controlled
noise, so the classifier learns general patterns instead of one
memorizable exact formula. Generation is fully reproducible via a
fixed random seed.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

RANDOM_SEED = 42
N_ROWS = 2_000

FEATURES = [
    "amount",
    "amount_to_user_average",
    "new_beneficiary",
    "beneficiary_age_days",
    "transactions_last_hour",
    "transactions_last_24h",
    "unusual_transaction_time",
    "session_change",
    "suspicious_context",
]

LABEL = "risky"


def _normal_row(rng: np.random.Generator) -> dict:
    """Everyday payment: small amount, known beneficiary, calm behaviour."""
    return {
        "amount": float(rng.integers(50, 5_000)),
        "amount_to_user_average": float(rng.uniform(0.2, 1.5)),
        "new_beneficiary": 0,
        "beneficiary_age_days": int(rng.integers(180, 3_650)),
        "transactions_last_hour": int(rng.integers(0, 2)),
        "transactions_last_24h": int(rng.integers(0, 6)),
        "unusual_transaction_time": 0,
        "session_change": 0,
        "suspicious_context": 0,
    }


def _moderate_row(rng: np.random.Generator) -> dict:
    """Some unusual factors, but not the strongest high-risk combination."""
    n_flags = int(rng.integers(1, 3))  # 1 or 2 moderate signals
    row = {
        "amount": float(rng.integers(1_000, 20_000)),
        "amount_to_user_average": float(rng.uniform(1.0, 4.0)),
        "new_beneficiary": int(rng.integers(0, 2)),
        "beneficiary_age_days": int(rng.integers(0, 720)),
        "transactions_last_hour": int(rng.integers(0, 3)),
        "transactions_last_24h": int(rng.integers(2, 10)),
        "unusual_transaction_time": 0,
        "session_change": 0,
        "suspicious_context": 0,
    }
    # Spread a couple of binary flags.
    flags = rng.permutation(["unusual_transaction_time", "session_change", "suspicious_context"])
    for name in flags[:n_flags]:
        row[name] = 1
    return row


def _suspicious_row(rng: np.random.Generator) -> dict:
    """High-risk shape: new beneficiary, large amount, pressure signals."""
    return {
        "amount": float(rng.integers(25_000, 200_000)),
        "amount_to_user_average": float(rng.uniform(5.0, 25.0)),
        "new_beneficiary": 1,
        "beneficiary_age_days": int(rng.integers(0, 3)),
        "transactions_last_hour": int(rng.integers(3, 10)),
        "transactions_last_24h": int(rng.integers(8, 25)),
        "unusual_transaction_time": int(rng.integers(0, 2)),
        "session_change": int(rng.integers(0, 2)),
        "suspicious_context": 1,
    }


def generate_dataset(n_rows: int = N_ROWS, seed: int = RANDOM_SEED) -> pd.DataFrame:
    """Generate the synthetic PayCare training dataset."""
    rng = np.random.default_rng(seed)
    rows: list[dict] = []

    # Mix: ~60% normal, ~25% moderate, ~15% clearly suspicious.
    for _ in range(n_rows):
        bucket = rng.random()
        if bucket < 0.60:
            rows.append(_normal_row(rng))
        elif bucket < 0.85:
            rows.append(_moderate_row(rng))
        else:
            rows.append(_suspicious_row(rng))

    df = pd.DataFrame(rows)

    # Label from predefined risk patterns: each factor adds weighted
    # evidence and the label is drawn probabilistically from that evidence.
    # This gives the model graded patterns plus noise, so it cannot simply
    # memorize one exact rule.
    risk_evidence = (
        1.6 * df["suspicious_context"]
        + 1.4 * df["new_beneficiary"]
        + (df["amount_to_user_average"] > 5.0).astype(int)
        + (df["transactions_last_hour"] >= 3).astype(int)
        + (df["transactions_last_24h"] >= 10).astype(int)
        + df["unusual_transaction_time"]
        + df["session_change"]
        + (df["amount"] > 40_000).astype(int)
    )
    p_risky = (0.02 + 0.22 * risk_evidence).clip(upper=0.97)
    df[LABEL] = (rng.random(len(df)) < p_risky).astype(int)

    return df[FEATURES + [LABEL]]


if __name__ == "__main__":
    data = generate_dataset()
    print(f"Generated {len(data)} rows (seed={RANDOM_SEED})")
    print(f"Risky share: {data[LABEL].mean():.1%}")
    print(data.head())
