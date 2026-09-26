"""
PayCare API: thin FastAPI layer over the Phase 1 hybrid risk engine.

The engine (backend/ml/risk_engine.py) remains the single source of
truth for scoring. This module only validates HTTP input, loads the
trained model once at startup, and returns structured JSON.

Run:  python -m uvicorn backend.app.main:app --reload --port 8001
Docs: http://127.0.0.1:8001/docs
"""

from __future__ import annotations

import sqlite3
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Path setup MUST come before local imports: backend/app and backend/ml are
# plain-module directories, and this must work however uvicorn imports us
# (module path `backend.app.main:app` OR file path `backend/app/main.py`).
APP_DIR = Path(__file__).resolve().parent
ML_DIR = APP_DIR.parent / "ml"
for _path in (str(APP_DIR), str(ML_DIR)):
    if _path not in sys.path:
        sys.path.insert(0, _path)

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

import database  # noqa: E402
from risk_engine import RiskInputError, assess_payment  # noqa: E402
from schemas import (  # noqa: E402
    PaymentFeaturesRequest,
    RiskAssessmentResponse,
    ThreatEventCreate,
    ThreatEventListResponse,
    ThreatEventResponse,
    ThreatEventSummaryResponse,
)

# Origins for the local React dev server(s). Vite prefers 5173 and
# automatically falls back to 5174 when it is occupied.
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

MODEL_PATH = ML_DIR / "model.pkl"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load the model and ensure the database exists."""
    if not MODEL_PATH.exists():
        raise RuntimeError(
            f"Trained model not found at {MODEL_PATH}. "
            "Run `python backend/ml/train.py` before starting the API."
        )
    app.state.model = _load_model(MODEL_PATH)
    try:
        database.init_db()
    except sqlite3.Error as exc:
        raise RuntimeError(f"Could not initialize SQLite database: {exc}") from exc
    yield


def _load_model(path: Path):
    import joblib

    return joblib.load(path)


app = FastAPI(
    title="PayCare API",
    description="Pre-payment fraud risk assessment for the PayCare MVP.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    """Simple liveness probe."""
    return {"status": "ok"}


@app.post("/api/assess-payment", response_model=RiskAssessmentResponse)
def assess(payload: PaymentFeaturesRequest) -> RiskAssessmentResponse:
    """Assess a transaction's pre-payment fraud risk."""
    try:
        result = assess_payment(payload.model_dump(), model=app.state.model)
    except RiskInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return RiskAssessmentResponse(**result)


@app.post("/api/threat-events", response_model=ThreatEventResponse)
def create_threat_event(payload: ThreatEventCreate) -> ThreatEventResponse:
    """Record a user decision (CANCELLED/CONTINUED) on a HIGH-risk payment."""
    if payload.risk_level != "HIGH":
        raise HTTPException(status_code=422, detail="Only HIGH-risk payments create threat events.")

    event = payload.model_dump()
    # Regenerate on the rare UNIQUE collision (concurrent requests same second).
    stored = None
    for _ in range(3):
        event["transaction_id"] = database.next_transaction_id()
        try:
            stored = database.insert_threat_event(event)
            break
        except sqlite3.IntegrityError:
            continue
        except sqlite3.Error:
            raise HTTPException(status_code=503, detail="Could not save the threat event. Try again.") from None
    if stored is None:
        raise HTTPException(status_code=503, detail="Could not save the threat event. Try again.")
    return ThreatEventResponse(**stored)


@app.get("/api/threat-events", response_model=ThreatEventListResponse)
def get_threat_events(limit: int = 50) -> ThreatEventListResponse:
    """Stored threat events, newest first."""
    try:
        events = database.list_threat_events(limit=min(max(limit, 1), 200))
    except sqlite3.Error:
        raise HTTPException(status_code=503, detail="Could not read threat events. Try again.") from None
    return ThreatEventListResponse(events=[ThreatEventResponse(**e) for e in events])


@app.get("/api/threat-events/summary", response_model=ThreatEventSummaryResponse)
def get_threat_summary() -> ThreatEventSummaryResponse:
    """Dashboard metrics computed from stored events."""
    try:
        return ThreatEventSummaryResponse(**database.get_summary())
    except sqlite3.Error:
        raise HTTPException(status_code=503, detail="Could not read summary. Try again.") from None
