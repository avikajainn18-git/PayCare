/** Risk result panel: score, level badge, action, explanation. */

import type { RiskAssessment } from "../types";
import { RiskReasons } from "./RiskReasons";
import { StatusBadge } from "./StatusBadge";

interface RiskResultProps {
  assessment: RiskAssessment;
  onEdit: () => void;
  disabled?: boolean;
}

const ACTION_HINTS: Record<string, string> = {
  LOW: "No significant risk detected. This payment looks normal.",
  MEDIUM: "This payment shows some unusual characteristics. Review before continuing.",
  HIGH: "This payment looks unusual. PayCare recommends stopping to verify.",
};

export function RiskResult({ assessment, onEdit, disabled = false }: RiskResultProps) {
  const { risk_score, risk_level, action, ml_score, rule_score, reasons } = assessment;

  return (
    <div className={`card risk-result result-${risk_level.toLowerCase()}`}>
      <div className="result-header">
        <StatusBadge level={risk_level} />
        <div className="score">
          <span className="score-value">{risk_score}</span>
          <span className="score-max"> / 100</span>
          <span className="score-label">Risk Score</span>
        </div>
      </div>

      <p className="result-hint">{ACTION_HINTS[risk_level]}</p>

      <div className="action-row">
        <span className="action-label">Recommended action:</span>
        <span className={`action action-${action.toLowerCase()}`}>{action}</span>
      </div>

      <RiskReasons reasons={reasons} />

      <p className="transparency">
        Model score {ml_score} · Rule score {rule_score}
      </p>

      <div className="result-actions">
        {risk_level === "LOW" && (
          <button className="primary" onClick={onEdit} disabled={disabled}>
            PROCEED WITH PAYMENT
          </button>
        )}
        {risk_level === "MEDIUM" && (
          <button className="secondary" onClick={onEdit} disabled={disabled}>
            REVIEW &amp; EDIT PAYMENT
          </button>
        )}
        {risk_level === "HIGH" && (
          <button className="secondary" onClick={onEdit} disabled={disabled}>
            BACK TO PAYMENT
          </button>
        )}
      </div>

      <small className="simulator-note">
        Simulation only — no real payment is executed by PayCare.
      </small>
    </div>
  );
}
