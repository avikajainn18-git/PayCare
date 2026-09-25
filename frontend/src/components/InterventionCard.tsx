/** HIGH-risk pre-payment intervention — the PayCare product moment. */

import type { RiskAssessment, UserDecision } from "../types";
import { RiskReasons } from "./RiskReasons";

interface InterventionCardProps {
  assessment: RiskAssessment;
  onDecision: (decision: UserDecision) => void;
}

export function InterventionCard({ assessment, onDecision }: InterventionCardProps) {
  return (
    <div className="card intervention" role="alertdialog" aria-labelledby="intervention-title">
      <div className="intervention-header">
        <span className="intervention-icon">⚠</span>
        <h2 id="intervention-title">HIGH-RISK PAYMENT</h2>
      </div>

      <div className="intervention-score">
        <span className="score-value">{assessment.risk_score}</span>
        <span className="score-max"> / 100</span>
      </div>

      <p className="intervention-text">
        This payment looks unusual for you. PayCare warns and explains — you decide.
      </p>

      <RiskReasons reasons={assessment.reasons} />

      <div className="intervention-actions">
        <button className="danger" onClick={() => onDecision("CANCELLED")}>
          CANCEL PAYMENT
        </button>
        <button className="secondary" onClick={() => onDecision("CONTINUED")}>
          CONTINUE ANYWAY
        </button>
      </div>

      <small className="simulator-note">
        Simulation only — PayCare does not execute or block a real UPI payment.
      </small>
    </div>
  );
}
