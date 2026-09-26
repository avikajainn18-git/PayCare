"""
SQLite persistence for PayCare threat events (Phase 4).

Deliberately simple: stdlib sqlite3, no ORM. The database file is
created automatically on first use — no manual SQL setup.

Schema note: only simulated, non-personal fields are stored. The
beneficiary name entered in the simulator is NOT persisted.
"""

from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

# backend/data/paycare.db — created automatically if missing.
# PAYCARE_DB_PATH overrides the location (used by the test suite).
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = Path(os.environ.get("PAYCARE_DB_PATH", str(DATA_DIR / "paycare.db")))

_SCHEMA = """
CREATE TABLE IF NOT EXISTS threat_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL UNIQUE,
    timestamp TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    action TEXT NOT NULL,
    user_decision TEXT NOT NULL CHECK (user_decision IN ('CANCELLED', 'CONTINUED')),
    ml_score INTEGER NOT NULL,
    rule_score INTEGER NOT NULL,
    reasons TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


def init_db(db_path: Path | str | None = None) -> None:
    """Create the data directory and threat_events table if needed."""
    path = Path(db_path or DB_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.execute(_SCHEMA)


def _connect(db_path: Path | str | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(Path(db_path or DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _row_to_event(row: sqlite3.Row) -> dict[str, Any]:
    """Convert a DB row into the API-facing event dict."""
    return {
        "transaction_id": row["transaction_id"],
        "timestamp": row["timestamp"],
        "risk_score": row["risk_score"],
        "risk_level": row["risk_level"],
        "action": row["action"],
        "user_decision": row["user_decision"],
        "ml_score": row["ml_score"],
        "rule_score": row["rule_score"],
        "reasons": json.loads(row["reasons"]),
    }


def next_transaction_id(now: datetime | None = None, db_path: Path | None = None) -> str:
    """Simulated ID of the form TXN-YYYYMMDD-NNNN (per-day sequence).

    It only identifies the simulated event — it is NOT a real UPI
    transaction ID.
    """
    now = now or datetime.now()
    date_part = now.strftime("%Y%m%d")
    with _connect(db_path) as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM threat_events WHERE transaction_id LIKE ?",
            (f"TXN-{date_part}-%",),
        ).fetchone()
    return f"TXN-{date_part}-{row['n'] + 1:04d}"


def insert_threat_event(event: dict[str, Any], db_path: Path | str | None = None) -> dict[str, Any]:
    """Persist one threat event and return it as stored."""
    path = db_path or DB_PATH
    timestamp = datetime.now().astimezone().isoformat(timespec="seconds")
    transaction_id = event["transaction_id"]
    with _connect(path) as conn:
        conn.execute(
            """
            INSERT INTO threat_events (
                transaction_id, timestamp, risk_score, risk_level, action,
                user_decision, ml_score, rule_score, reasons, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                transaction_id,
                timestamp,
                event["risk_score"],
                event["risk_level"],
                event["action"],
                event["user_decision"],
                event["ml_score"],
                event["rule_score"],
                json.dumps(event["reasons"]),
                timestamp,
            ),
        )
    return {**event, "timestamp": timestamp}


def list_threat_events(limit: int = 50, db_path: Path | str | None = None) -> list[dict[str, Any]]:
    """Return stored threat events, newest first."""
    with _connect(db_path) as conn:
        rows = conn.execute(
            "SELECT * FROM threat_events ORDER BY id DESC LIMIT ?",
            (int(limit),),
        ).fetchall()
    return [_row_to_event(row) for row in rows]


def get_summary(db_path: Path | str | None = None) -> dict[str, int]:
    """Aggregated dashboard metrics computed from stored events."""
    with _connect(db_path) as conn:
        total = conn.execute("SELECT COUNT(*) AS n FROM threat_events").fetchone()["n"]
        high = conn.execute(
            "SELECT COUNT(*) AS n FROM threat_events WHERE risk_level = 'HIGH'"
        ).fetchone()["n"]
        cancelled = conn.execute(
            "SELECT COUNT(*) AS n FROM threat_events WHERE user_decision = 'CANCELLED'"
        ).fetchone()["n"]
        continued = conn.execute(
            "SELECT COUNT(*) AS n FROM threat_events WHERE user_decision = 'CONTINUED'"
        ).fetchone()["n"]
        distribution = {
            row["risk_level"]: row["n"]
            for row in conn.execute(
                "SELECT risk_level, COUNT(*) AS n FROM threat_events GROUP BY risk_level"
            ).fetchall()
        }
    return {
        "total_events": total,
        "high_risk_events": high,
        "cancelled": cancelled,
        "continued": continued,
        "risk_distribution": {
            "LOW": distribution.get("LOW", 0),
            "MEDIUM": distribution.get("MEDIUM", 0),
            "HIGH": distribution.get("HIGH", 0),
        },
    }
