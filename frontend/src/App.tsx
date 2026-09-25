/**
 * PayCare payment simulator — screen flow:
 * form → loading → risk result → (HIGH only) intervention → decision.
 * Decisions are local/in-memory for this phase (SQLite comes next).
 */

import { useCallback, useState } from "react";
import { assessPayment, ApiError } from "./api";
import { DEMO_PRESETS } from "./presets";
import type { PaymentFeatures, RiskAssessment, UserDecision } from "./types";
import { PaymentForm } from "./components/PaymentForm";
import { RiskResult } from "./components/RiskResult";
import { InterventionCard } from "./components/InterventionCard";
import { LoadingState } from "./components/LoadingState";

type Screen = "form" | "loading" | "result" | "intervention" | "decided";

const DEFAULT_FEATURES: PaymentFeatures = DEMO_PRESETS[0].features;

/** Validate locally before hitting the API; returns an error message or null. */
function validate(features: PaymentFeatures): string | null {
  if (!Number.isFinite(features.amount) || features.amount <= 0) {
    return "Amount must be a positive number.";
  }
  if (!Number.isFinite(features.amount_to_user_average) || features.amount_to_user_average <= 0) {
    return "Amount vs normal must be a positive number.";
  }
  if (
    !Number.isInteger(features.beneficiary_age_days) ||
    features.beneficiary_age_days < 0 ||
    !Number.isInteger(features.transactions_last_hour) ||
    features.transactions_last_hour < 0 ||
    !Number.isInteger(features.transactions_last_24h) ||
    features.transactions_last_24h < 0
  ) {
    return "Age and transaction counts must be whole numbers, zero or more.";
  }
  return null;
}

export default function App() {
  const [features, setFeatures] = useState<PaymentFeatures>(DEFAULT_FEATURES);
  const [screen, setScreen] = useState<Screen>("form");
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [decision, setDecision] = useState<UserDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handlePreset = useCallback(
    (presetId: string) => {
      const preset = DEMO_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        setFeatures(preset.features);
        setValidationError(null);
      }
    },
    []
  );

  const runAssessment = useCallback(async (payload: PaymentFeatures) => {
    const problem = validate(payload);
    if (problem) {
      setValidationError(problem);
      return;
    }
    setValidationError(null);
    setError(null);
    setScreen("loading");
    try {
      const result = await assessPayment(payload);
      setAssessment(result);
      if (result.risk_level === "HIGH") {
        setScreen("intervention");
      } else {
        setScreen("result");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail ?? err.message : "Unexpected error.");
      setScreen("form");
      setFeatures(payload);
    }
  }, []);

  const handleDecision = useCallback((chosen: UserDecision) => {
    setDecision(chosen);
    setScreen("decided");
  }, []);

  const resetToForm = useCallback(() => {
    setScreen("form");
    setAssessment(null);
    setDecision(null);
    setError(null);
  }, []);

  return (
    <main className="app">
      <header className="header">
        <h1>PayCare</h1>
        <p className="tagline">Pre-payment fraud risk, explained before you pay.</p>
      </header>

      {screen === "form" && (
        <>
          <PaymentForm
            features={features}
            onChange={setFeatures}
            onSubmit={runAssessment}
            disabled={false}
            onPreset={handlePreset}
            presets={DEMO_PRESETS}
            validationError={validationError}
          />
          {error && (
            <div className="card error-banner" role="alert">
              <p>{error}</p>
              <button className="secondary" onClick={() => setError(null)}>
                DISMISS
              </button>
            </div>
          )}
        </>
      )}

      {screen === "loading" && <LoadingState />}

      {screen === "result" && assessment && (
        <RiskResult assessment={assessment} onEdit={resetToForm} />
      )}

      {screen === "intervention" && assessment && (
        <InterventionCard assessment={assessment} onDecision={handleDecision} />
      )}

      {screen === "decided" && decision === "CANCELLED" && (
        <div className="card outcome outcome-cancelled">
          <h2>Payment cancelled.</h2>
          <p>You chose not to continue with this high-risk payment.</p>
          <button className="primary" onClick={resetToForm}>
            NEW PAYMENT
          </button>
        </div>
      )}

      {screen === "decided" && decision === "CONTINUED" && (
        <div className="card outcome outcome-continued">
          <h2>Payment continued in simulation.</h2>
          <p>
            You chose to proceed despite the warning. In the full product this decision would be
            recorded for fraud intelligence.
          </p>
          <button className="primary" onClick={resetToForm}>
            NEW PAYMENT
          </button>
        </div>
      )}

      <footer className="footer">
        <small>
          PayCare MVP — prototype for pre-payment risk validation. No real payments are processed.
        </small>
      </footer>
    </main>
  );
}
