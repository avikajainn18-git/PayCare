"""
PayCare API: thin FastAPI layer over the Phase 1 hybrid risk engine.

The engine (backend/ml/risk_engine.py) remains the single source of
truth for scoring. This module only validates HTTP input, loads the
trained model once at startup, and returns structured JSON.

Run:  python -m uvicorn backend.app.main:app --reload --port 8001
Docs: http://127.0.0.1:8001/docs
"""

from __future__ import annotations

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

from risk_engine import RiskInputError, assess_payment  # noqa: E402
from schemas import PaymentFeaturesRequest, RiskAssessmentResponse  # noqa: E402

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
    """Load the trained model once at startup; fail loudly if missing."""
    if not MODEL_PATH.exists():
        raise RuntimeError(
            f"Trained model not found at {MODEL_PATH}. "
            "Run `python backend/ml/train.py` before starting the API."
        )
    app.state.model = _load_model(MODEL_PATH)
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
