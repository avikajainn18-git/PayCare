"""
Train the PayCare XGBoost risk classifier on the synthetic dataset.

The model is trained on synthetic transaction scenarios for prototype
validation. Production deployment would require real historical
bank/PSP data.

Run:  python backend/ml/train.py
"""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from dataset import FEATURES, LABEL, RANDOM_SEED, generate_dataset

MODEL_PATH = Path(__file__).with_name("model.pkl")
TEST_SIZE = 0.2


def train_model(df: pd.DataFrame) -> XGBClassifier:
    """Train a small, fast XGBoost classifier and print evaluation metrics."""
    X = df[FEATURES]
    y = df[LABEL]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_SEED
    )

    model = XGBClassifier(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.9,
        colsample_bytree=0.9,
        eval_metric="logloss",
        random_state=RANDOM_SEED,
        n_jobs=1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("Model evaluation (held-out test set):")
    print(f"  accuracy : {accuracy_score(y_test, y_pred):.3f}")
    print(f"  precision: {precision_score(y_test, y_pred):.3f}")
    print(f"  recall   : {recall_score(y_test, y_pred):.3f}")
    print(f"  f1       : {f1_score(y_test, y_pred):.3f}")
    return model


def main() -> None:
    df = generate_dataset()
    print(f"Dataset: {len(df)} rows, risky share {df[LABEL].mean():.1%}")

    model = train_model(df)
    joblib.dump(model, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
