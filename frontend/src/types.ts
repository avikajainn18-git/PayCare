/** Shared types mirroring the FastAPI schemas (backend/app/schemas.py). */

/** Transaction + context signals — exactly the nine Pydantic fields. */
export interface PaymentFeatures {
  amount: number;
  amount_to_user_average: number;
  new_beneficiary: boolean;
  beneficiary_age_days: number;
  transactions_last_hour: number;
  transactions_last_24h: number;
  unusual_transaction_time: boolean;
  session_change: boolean;
  suspicious_context: boolean;
}

/** Response from POST /api/assess-payment. */
export interface RiskAssessment {
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  action: "PROCEED" | "MONITOR" | "WARN";
  ml_score: number;
  rule_score: number;
  reasons: string[];
}

/** The user's decision on a HIGH-risk intervention (local, in-memory for now). */
export type UserDecision = "CANCELLED" | "CONTINUED";

/** A deterministic demo preset for reliable judging runs. */
export interface DemoPreset {
  id: string;
  label: string;
  description: string;
  features: PaymentFeatures;
}
