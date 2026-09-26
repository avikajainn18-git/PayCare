/** HIGH-risk pre-payment intervention — the PayCare product moment. */

import type { RiskAssessment, UserDecision } from "../types";
import { RiskReasons } from "./RiskReasons";
import { StatusBadge } from "./StatusBadge";

interface InterventionCardProps {
  assessment: RiskAssessment;
  onDecision: (decision: UserDecision) => void;
  saveError?: string | null;
}

export function InterventionCard({ assessment, onDecision, saveError }: InterventionCardProps) {
  return (
    <div
      className="card intervention-card"
      role="alertdialog"
      aria-labelledby="intervention-title"
    >
      <div className="intervention-head">
        <span className="warn-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </span>
        <div>
          <span className="eyebrow" style={{ color: "var(--high)" }}>
            High-risk payment
          </span>
          <h2 id="intervention-title">
            This payment looks significantly different from your normal activity.
          </h2>
        </div>
      </div>

      <div className="intervention-score">
        <div>
          <span className="score-xl">{assessment.risk_score}</span>
          <span className="score-denom">/100</span>
        </div>
        <StatusBadge level={assessment.risk_level} />
      </div>

      <RiskReasons reasons={assessment.reasons} title="Why we're warning you" />

      {saveError && (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      )}

      <div className="intervention-actions">
        <button className="btn btn-danger" disabled={!!saveError} onClick={() => onDecision("CANCELLED")}>
          Cancel Payment
        </button>
        <button
          className="btn btn-secondary"
          disabled={!!saveError}
          onClick={() => onDecision("CONTINUED")}
        >
          Continue Anyway
        </button>
      </div>

      <small className="intervention-note">
        Simulation only — PayCare does not execute or block a real UPI payment. You stay in control.
      </small>
    </div>
  );
}
