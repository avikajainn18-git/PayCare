# PayCare

**Pre-Payment Fraud Risk Protection for Digital Payments**

> **Protect Before Payment. Detect Risk Before It Becomes a Loss.**

PayCare evaluates transaction + contextual signals **before** a user authorizes a
payment, produces an explainable risk score, and gives the user a chance to
cancel or continue.

> **This is a hackathon MVP / prototype.** It does **not** execute real UPI
> payments, has **no** live NPCI integration, **no** live I4C integration, and
> **no** live bank/PSP integrations. It does **not** claim production-grade
> fraud detection.

---

## 1. What PayCare Solves

A socially engineered payment can look **technically legitimate** while the user
is being manipulated into authorizing it. Traditional fraud systems analyze
transactions during or after settlement — by then, the money has moved.

PayCare adds a risk layer **before authorization**:

```
User manipulated
  → suspicious payment prepared
  → PayCare evaluates risk
  → risk + reasons shown
  → user decides
  → cancel / continue
```

## 2. Proposed Solution

A lightweight hybrid risk engine that combines:

- **XGBoost** — learns risk patterns from transaction/context features
- **Deterministic rules** — known high-risk conditions, human-readable reasons
- **Explainable risk scoring** — every warning shows *why*
- **Pre-payment intervention** — warn, explain, let the user decide
- **SQLite threat-event storage** — decisions become fraud intelligence
- **A lightweight threat dashboard** — real recorded activity, no fake metrics

Larger systems (streaming, graph intelligence, on-device inference) are future
scope — see [Future Scope](#20-future-scope).

## 3. MVP Scope

The MVP demonstrates one complete, believable loop — and demonstrates that
PayCare does **not** simply flag everything as fraud:

**Normal payment:**

```
Payment → LOW → PROCEED
```

**Suspicious payment:**

```
Payment → risk assessment → HIGH → explanation → warning
        → CANCEL / CONTINUE → threat event → dashboard
```

**Risk bands and actions:**

| Score    | Level  | Action    |
| -------- | ------ | --------- |
| 0–39     | LOW    | PROCEED   |
| 40–69    | MEDIUM | MONITOR   |
| 70–100   | HIGH   | WARN      |

The three-tier design (LOW / MEDIUM / HIGH) shows risk **gradation** rather
than binary fraud detection.

## 4. How PayCare Works

```
Transaction + Context
        ↓
Feature Extraction
        ↓
Rule Engine + XGBoost
        ↓
Hybrid Risk Score
        ↓
Risk + Reasons
        ↓
LOW / MEDIUM / HIGH
        ↓
Pre-Payment Action
```

## 5. Risk Engine

### ML model

The MVP uses **`XGBClassifier`** on a compact feature set:

| Transaction features          | Context features            |
| ----------------------------- | --------------------------- |
| `amount`                      | `unusual_transaction_time`  |
| `amount_to_user_average`      | `session_change`            |
| `new_beneficiary`             | `suspicious_context`        |
| `beneficiary_age_days`        |                             |
| `transactions_last_hour`      |                             |
| `transactions_last_24h`       |                             |

These are **simulated structured inputs** supplied by the simulator UI — NOT
phone telemetry, accessibility data, call state, clipboard, or sensors.

Training data is **synthetic**: labeled from predefined risk patterns with
controlled noise, so the model learns general patterns instead of one exact
formula. On the synthetic hold-out set the current model measures ~0.88
accuracy / 0.80 F1 — meaningful only for prototype validation, not a claim
about real-world fraud performance.

### Hybrid scoring

```
Final Score = 0.6 × ML Score + 0.4 × Rule Score
```

where ML Score = model probability × 100 and Rule Score is a 0–100 point
accumulation from fired rules.

## 6. Explainability

Deterministic rules handle known risk conditions and produce **human-readable
reasons** — the system never returns a vague "fraud detected":

- New beneficiary
- Amount is significantly above normal
- Large transaction amount
- High transaction velocity
- Unusual transaction time
- Session change detected
- Suspicious contextual signal
- Classic scam pattern (new beneficiary + high amount + suspicious context)

Users see **why** a payment looks unusual.

## 7. Pre-Payment Intervention

The intervention is the core product moment:

```
HIGH-RISK PAYMENT
Risk Score: 99/100

Why are we warning you?
• New beneficiary
• Large transaction amount
• High transaction velocity
• Unusual transaction time

[ CANCEL PAYMENT ]  [ CONTINUE ANYWAY ]
```

The warning is simulated — PayCare does not execute or block a real payment.
The user stays in control: PayCare warns and explains; the user decides.

## 8. Threat Events

HIGH-risk user decisions are persisted as threat events containing:

- `transaction_id` (simulated `TXN-YYYYMMDD-NNNN`)
- `timestamp`
- `risk_score`
- `risk_level`
- `action`
- `user_decision` (`CANCELLED` / `CONTINUED`)
- `ml_score`, `rule_score`
- `reasons`

LOW and MEDIUM assessments create **no** threat event, so event counts reflect
meaningful suspicious activity rather than inflated totals. No personal
information is stored — the beneficiary name is never persisted.

## 9. Threat Dashboard

The dashboard reads **real SQLite data** — no hardcoded demo metrics:

- Total Threat Events
- High-Risk Events
- Cancelled vs Continued
- Risk-level distribution chart
- Recent events table (newest first)
- Event detail with triggered reasons

## 10. MVP Architecture

```
React
 ↓
FastAPI
 ↓
Risk Engine
 ├── XGBoost
 └── Rules
 ↓
SQLite Threat Events
 ↓
Threat Dashboard
```

- **Frontend** — payment simulator, risk result, intervention, dashboard, home
- **API layer** — request validation (Pydantic), thin wrapper over the engine
- **Risk engine** — pure Python: rules + ML probability → hybrid score
- **Persistence** — stdlib `sqlite3`, no ORM; DB auto-created at startup

## 11. Tech Stack

| Layer     | Technologies                                          |
| --------- | ----------------------------------------------------- |
| Frontend  | React, Vite, TypeScript, Lucide React, Recharts       |
| Backend   | Python, FastAPI, Pydantic, Uvicorn                    |
| ML / Data | pandas, NumPy, scikit-learn, XGBoost, joblib          |
| Storage   | SQLite                                                |
| Deploy    | Render                                                |

Technologies listed under [Future Scope](#20-future-scope) are **not** part of
the current MVP implementation.

## 12. Project Structure

```
PayCare/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, endpoints, CORS, lifespan
│   │   ├── schemas.py         # Pydantic request/response models
│   │   └── database.py        # SQLite persistence (threat events)
│   ├── ml/
│   │   ├── dataset.py         # Synthetic dataset generator
│   │   ├── train.py           # XGBoost training → model.pkl
│   │   ├── rules.py           # Deterministic rule engine
│   │   ├── risk_engine.py     # Hybrid scoring (ML + rules)
│   │   ├── demo.py            # Three-scenario terminal demo
│   │   └── model.pkl          # Trained model artifact
│   ├── data/                  # SQLite database (auto-created, git-ignored)
│   ├── tests/
│   └── requirements.txt
├── frontend/                  # React + Vite + TypeScript app
├── start-dev.bat              # One-command local startup (Windows)
├── .gitignore
├── .python-version            # 3.11.9
└── README.md
```

## 13. API Overview

| Method | Endpoint                     | Description                                        |
| ------ | ---------------------------- | -------------------------------------------------- |
| GET    | `/api/health`                | Liveness probe                                     |
| POST   | `/api/assess-payment`        | Hybrid risk assessment of a transaction + context  |
| POST   | `/api/threat-events`         | Record a HIGH-risk user decision                   |
| GET    | `/api/threat-events`         | Stored threat events (newest first)                |
| GET    | `/api/threat-events/summary` | Aggregated dashboard metrics                       |

Interactive docs: `http://127.0.0.1:8001/docs` (Swagger).

**Example assessment request** (`POST /api/assess-payment`):

```json
{
  "amount": 45000,
  "amount_to_user_average": 15.0,
  "new_beneficiary": true,
  "beneficiary_age_days": 0,
  "transactions_last_hour": 5,
  "transactions_last_24h": 12,
  "unusual_transaction_time": true,
  "session_change": true,
  "suspicious_context": true
}
```

**Example response:**

```json
{
  "risk_score": 99,
  "risk_level": "HIGH",
  "action": "WARN",
  "ml_score": 98,
  "rule_score": 100,
  "reasons": [
    "New beneficiary",
    "Amount is significantly above normal",
    "Large transaction amount",
    "High transaction velocity",
    "Unusual transaction time",
    "Session change detected",
    "Suspicious contextual signal",
    "Classic scam pattern: new beneficiary + high amount + suspicious context"
  ]
}
```

## 14. Local Setup

**One command (Windows)** — from the repository root:

```bash
start-dev.bat
```

This creates the venv if missing, installs dependencies, trains the model if
`model.pkl` is absent, and starts:

- **Backend:** http://127.0.0.1:8001
- **Frontend:** http://localhost:5173 (Vite falls back to another free port,
  e.g. 5174, if 5173 is busy — the reported URL is always the actual one)

**Manual backend:**

```bash
.venv\Scripts\activate
python -m uvicorn backend.app.main:app --reload --port 8001
```

**Manual frontend:**

```bash
cd frontend
npm ci
npm run dev
```

**Model training / demo (optional — model.pkl is committed):**

```bash
.venv\Scripts\python backend\ml\train.py
.venv\Scripts\python backend\ml\demo.py
```

## 15. Testing

```bash
python -m pytest backend/tests -v
```

**Current result: 33 backend tests pass** (risk engine, rules, API scenarios,
validation, threat-event persistence, restart persistence).

```bash
cd frontend
npm run build
```

Type-checks and produces the production build in `dist/`.

## 16. Demo Flow

Deterministic presets on the simulator page (LOW / MEDIUM / HIGH RISK DEMO):

**LOW** — ₹500, known beneficiary, normal behaviour and context
→ LOW → PROCEED (no threat event)

**MEDIUM** — moderately unusual factors (amount ~4.5× the user's average,
elevated velocity, unusual hour, known beneficiary)
→ MEDIUM → MONITOR (no threat event)

**HIGH** — ₹45,000, new beneficiary, high amount ratio, high velocity, unusual
time, session change, suspicious context
→ HIGH → explanation → intervention → CANCEL / CONTINUE → threat event →
dashboard

## 17. Deployment on Render

**Backend — Render Web Service**

| Setting   | Value                                        |
| --------- | -------------------------------------------- |
| Root      | `backend`                                     |
| Build     | `pip install -r requirements.txt`             |
| Start     | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health    | `/api/health`                                 |
| Env       | `PYTHON_VERSION=3.11.9`                       |
| Env       | `PAYCARE_FRONTEND_URL=https://paycare-frontend.onrender.com` |

`PAYCARE_FRONTEND_URL` adds the deployed frontend origin to the CORS
allow-list (exact origin — no wildcard CORS). Localhost origins are always
included for development.

**Frontend — Render Static Site**

| Setting | Value                                       |
| ------- | ------------------------------------------- |
| Root    | `frontend`                                   |
| Build   | `npm ci && npm run build`                    |
| Publish | `dist`                                       |
| Env     | `VITE_API_BASE_URL=https://paycare-api.onrender.com` |

- Backend: https://paycare-api.onrender.com
- Frontend: https://paycare-frontend.onrender.com

**Important — SQLite persistence on Render:** Render's free filesystem is
**ephemeral**, so SQLite threat-event data may be reset on restart/redeploy.
The app supports the `PAYCARE_DB_PATH` environment variable for attaching a
persistent disk or migrating to a managed database later.

## 18. Privacy / MVP Boundaries

The MVP does **not** collect:

- UPI PIN or real payment credentials
- Raw audio, keystrokes, or call recordings
- Sensor data or clipboard contents
- Real device telemetry
- Real bank/PSP account data

All context signals (`unusual_transaction_time`, `session_change`,
`suspicious_context`) are **simulator inputs**. No personal information is
persisted — the beneficiary name is never stored.

## 19. Synthetic Data Disclaimer

> The MVP model is trained on synthetic transaction scenarios for prototype
> validation. Production deployment would require real historical bank/PSP
> transaction data.

## 20. Future Scope

**Not part of the current MVP.** Candidates for production evolution:

- Streaming/event infrastructure (Kafka, Redis)
- Graph intelligence (Neo4j) and GNN-based fraud-network detection
- Isolation Forest / SHAP-based model explanations
- On-device inference (TFLite / Core ML)
- Bank/PSP integrations; authorized NPCI/I4C integrations
- Production monitoring and MLOps
- Managed persistent database

## 21. Product Philosophy

**BEFORE PAYMENT** — Assess risk before authorization.

**EXPLAINABLE** — Show the factors behind the warning.

**USER IN CONTROL** — Warn and guide while leaving the final decision to the user.

## 22. Current MVP Status

The MVP currently includes:

- XGBoost + rule-based hybrid risk engine
- FastAPI backend
- React payment simulator (with Home landing page and threat dashboard)
- Pre-payment intervention (cancel / continue)
- SQLite threat events
- Threat dashboard on real data
- Deterministic demo presets
- 33 backend tests + frontend production build
- One-command local startup
- Render deployment configuration

The MVP validates PayCare's pre-payment risk assessment and intervention
workflow. It is **not** production-ready and makes no claim of reliable
real-world fraud detection.
