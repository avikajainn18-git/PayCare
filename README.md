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
- `backend/app/` — FastAPI service: risk assessment (`/api/health`,
  `/api/assess-payment`) and threat-event persistence (`POST/GET
  /api/threat-events`, `GET /api/threat-events/summary`) backed by SQLite
  (`backend/app/database.py`, stdlib `sqlite3`, no ORM; DB auto-created at startup).
- `frontend/` — React + Vite + TypeScript payment simulator with demo presets, the
  high-risk intervention (cancel/continue) flow, and the Threat Dashboard
  (metrics, risk-level distribution chart, event table with details) reading live
  SQLite data.

React → FastAPI → SQLite. No third-party data stores; no personal information is
persisted (the beneficiary name is never stored).

## One-command startup (Windows)

```bash
start-dev.bat
```

Creates the venv and installs dependencies if missing, trains the model if
`model.pkl` is absent, starts **FastAPI on http://127.0.0.1:8001** and the Vite
dev server (prefers http://localhost:5173, auto-falls back to 5174 if busy),
waits for both health checks, and opens the frontend in your browser. No manual
venv activation, no environment variables, no second terminal.

## Manual setup

### Backend

```bash
python -m venv .venv
.venv/Scripts/pip install -r backend/requirements.txt   # Windows Git Bash
# source .venv/bin/activate && pip install -r backend/requirements.txt  # macOS/Linux

# The trained model (backend/ml/model.pkl) is committed. To regenerate it:
.venv/Scripts/python backend/ml/train.py

# Start the API on http://127.0.0.1:8001 (Swagger docs at /docs)
.venv/Scripts/python -m uvicorn backend.app.main:app --reload --port 8001

# Run the risk-engine demo and the backend test suite
.venv/Scripts/python backend/ml/demo.py
.venv/Scripts/python -m pytest backend/tests -v
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev        # prefers http://localhost:5173 (expects the API on port 8001)
npm run build      # production build to dist/
```

## Demo flow

Use the preset buttons (LOW / MEDIUM / HIGH RISK DEMO) to populate the payment form,
then **CHECK PAYMENT RISK**. LOW proceeds, MEDIUM suggests review, HIGH opens the
intervention card where the user must cancel or continue.

- **LOW** → LOW RISK, PROCEED — no threat event is created.
- **MEDIUM** → MEDIUM RISK, MONITOR — no threat event is created.
- **HIGH → CANCEL** → "Payment cancelled in simulation" — threat event stored.
- **HIGH → CONTINUE** → "Payment continued in simulation" — threat event stored.

Every HIGH-risk decision is persisted (as `TXN-YYYYMMDD-NNNN`) before the outcome
screen appears. Open **THREAT DASHBOARD** to see total events, cancelled vs
continued, the risk-level distribution, and a newest-first event table — click a
row for full details (score, action, decision, reasons). Events survive backend
restarts (SQLite file under `backend/data/`). No real payment is executed at any
point.

## Tests

```bash
.venv/Scripts/python -m pytest backend/tests -v   # engine, API, persistence (33 tests)
cd frontend && npm run build                      # type-checks + production build
```
