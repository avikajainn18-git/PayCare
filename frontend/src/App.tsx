/**
 * PayCare app shell: slim sidebar + compact top header + content canvas.
 * Screen flow inside the simulator tab:
 * form → loading → risk result → (HIGH only) intervention → decision.
 *
 * HIGH-risk decisions are persisted via POST /api/threat-events before the
 * outcome screen is shown; the threat dashboard reads them back from SQLite.
 * Product logic and API contracts are unchanged — this is presentation only.
 */

import { useCallback, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { ApiError, assessPayment, createThreatEvent } from "./api";
import { DEMO_PRESETS } from "./presets";
import type { PaymentFeatures, RiskAssessment, UserDecision } from "./types";
import type { Tab } from "./nav";
import { PaymentForm } from "./components/PaymentForm";
import { RiskResult } from "./components/RiskResult";
import { InterventionCard } from "./components/InterventionCard";
import { LoadingState } from "./components/LoadingState";
import { ThreatDashboard } from "./components/ThreatDashboard";
import { Sidebar } from "./components/Sidebar";
import { TopHeader } from "./components/TopHeader";

type Screen = "form" | "loading" | "result" | "intervention" | "saving" | "decided";

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
  const [tab, setTab] = useState<Tab>("simulator");
  const [features, setFeatures] = useState<PaymentFeatures>(DEFAULT_FEATURES);
  const [screen, setScreen] = useState<Screen>("form");
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [decision, setDecision] = useState<UserDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handlePreset = useCallback((presetId: string) => {
    const preset = DEMO_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setFeatures(preset.features);
      setValidationError(null);
    }
  }, []);

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

  const handleDecision = useCallback(
    async (chosen: UserDecision) => {
      if (!assessment) return;
      setSaveError(null);
      setScreen("saving");
      try {
        // Persist first — the outcome screen only appears after the event is stored.
        await createThreatEvent({
          risk_score: assessment.risk_score,
          risk_level: assessment.risk_level,
          action: assessment.action,
          user_decision: chosen,
          ml_score: assessment.ml_score,
          rule_score: assessment.rule_score,
          reasons: assessment.reasons,
        });
        setDecision(chosen);
        setScreen("decided");
      } catch (err) {
        setSaveError(
          err instanceof ApiError
            ? err.detail ?? err.message
            : "Could not record the decision. Please try again."
        );
        setScreen("intervention");
      }
    },
    [assessment]
  );

  const resetToForm = useCallback(() => {
    setScreen("form");
    setAssessment(null);
    setDecision(null);
    setError(null);
    setSaveError(null);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar tab={tab} onNavigate={setTab} />
      <div className="app-col">
        <TopHeader />
        <main className="main">
          {tab === "dashboard" && <ThreatDashboard />}

          {tab === "simulator" && (
            <>
              {screen === "form" && (
                <>
                  <div className="page-head">
                    <h1>Payment Protection</h1>
                    <p>Check a payment before authorization.</p>
                  </div>
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
                      <button className="btn btn-secondary btn-sm" onClick={() => setError(null)}>
                        Dismiss
                      </button>
                    </div>
                  )}
                </>
              )}

              {screen === "loading" && <LoadingState />}

              {screen === "saving" && (
                <div className="card loading" role="status">
                  <div className="spinner" aria-hidden="true" />
                  <p>Recording your decision…</p>
                </div>
              )}

              {screen === "result" && assessment && (
                <RiskResult assessment={assessment} onEdit={resetToForm} />
              )}

              {screen === "intervention" && assessment && (
                <InterventionCard
                  assessment={assessment}
                  onDecision={handleDecision}
                  saveError={saveError}
                />
              )}

              {screen === "decided" && decision === "CANCELLED" && (
                <div className="card outcome outcome-cancelled">
                  <div className="outcome-head">
                    <span className="outcome-icon">
                      <ShieldCheck size={22} strokeWidth={2} />
                    </span>
                    <h2>Payment cancelled in simulation.</h2>
                  </div>
                  <p>
                    You chose not to continue with this high-risk payment. The threat event has been
                    recorded.
                  </p>
                  <button className="btn btn-primary" onClick={resetToForm}>
                    NEW PAYMENT
                  </button>
                </div>
              )}

              {screen === "decided" && decision === "CONTINUED" && (
                <div className="card outcome outcome-continued">
                  <div className="outcome-head">
                    <span className="outcome-icon">
                      <ArrowRight size={22} strokeWidth={2} />
                    </span>
                    <h2>Payment continued in simulation.</h2>
                  </div>
                  <p>
                    You chose to proceed despite the warning. This decision has been recorded for
                    fraud intelligence.
                  </p>
                  <button className="btn btn-primary" onClick={resetToForm}>
                    NEW PAYMENT
                  </button>
                </div>
              )}
            </>
          )}

          <footer className="footer">
            <small>
              PayCare MVP — prototype for pre-payment risk validation. No real payments are processed.
            </small>
          </footer>
        </main>
      </div>
    </div>
  );
}
