# PayCare MVP

Pre-payment fraud risk layer for digital payments (prototype). PayCare assesses a
transaction + context signals **before** authorization, returns a hybrid risk score
with human-readable reasons, and — for high risk — warns the user so they can
cancel or continue. User decisions are the intended input for fraud intelligence.

> **Scope disclaimer:** This MVP is a prototype validating the pre-payment risk
> assessment, explanation, and intervention workflow. It does **not** execute real
> UPI payments and has **no** NPCI, I4C, bank, or PSP integrations. The ML model is
> trained on **synthetic transaction scenarios** for prototype validation; production
> deployment would require real historical bank/PSP data.

## Architecture

- `backend/ml/` — synthetic dataset generator, XGBoost training, deterministic rule
  engine, hybrid risk engine (`0.6 × ML + 0.4 × rule`, bands: 0–39 LOW, 40–69 MEDIUM,
  70–100 HIGH), demo scenarios.
- `backend/app/` — FastAPI service exposing the engine (`/api/health`,
  `/api/assess-payment`).
- `frontend/` — React + Vite + TypeScript payment simulator with demo presets and
  the high-risk intervention (cancel/continue) flow.

## Backend setup

```bash
python -m venv .venv
.venv/Scripts/pip install -r backend/requirements.txt   # Windows Git Bash
# source .venv/bin/activate && pip install -r backend/requirements.txt  # macOS/Linux

# The trained model (backend/ml/model.pkl) is committed. To regenerate it:
.venv/Scripts/python backend/ml/train.py

# Start the API on http://127.0.0.1:8000 (Swagger docs at /docs)
.venv/Scripts/python -m uvicorn backend.app.main:app --reload

# Run the risk-engine demo and the backend test suite
.venv/Scripts/python backend/ml/demo.py
.venv/Scripts/python -m pytest backend/tests -v
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (expects the API on port 8000)
npm run build      # production build to dist/
```

## Demo flow

Use the preset buttons (LOW / MEDIUM / HIGH RISK DEMO) to populate the payment form,
then **CHECK PAYMENT RISK**. LOW proceeds, MEDIUM suggests review, HIGH opens the
intervention card where the user must cancel or continue. No real payment is executed
at any point.
