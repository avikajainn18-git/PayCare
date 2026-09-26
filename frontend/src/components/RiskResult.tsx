/** Premium risk summary card: hero score, badge, reason chips, transparency. */

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
    <div className={`card result-card result-${risk_level.toLowerCase()}`}>
      <span className="eyebrow">Payment risk</span>
      <div className="result-hero">
        <div>
          <span className="score-xl">{risk_score}</span>
          <span className="score-denom">/100</span>
        </div>
        <StatusBadge level={risk_level} />
      </div>

      <p className="result-hint">{ACTION_HINTS[risk_level]}</p>

      <p className="action-chip">
        Recommended action: <b>{action}</b>
      </p>

      <RiskReasons reasons={reasons} />

      <p className="score-meta">
        Model score {ml_score} · Rule score {rule_score}
      </p>

      <div className="result-actions">
        {risk_level === "LOW" && (
          <button className="btn btn-primary" onClick={onEdit} disabled={disabled}>
            PROCEED WITH PAYMENT
          </button>
        )}
        {risk_level === "MEDIUM" && (
          <button className="btn btn-secondary" onClick={onEdit} disabled={disabled}>
            REVIEW &amp; EDIT PAYMENT
          </button>
        )}
        {risk_level === "HIGH" && (
          <button className="btn btn-secondary" onClick={onEdit} disabled={disabled}>
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
