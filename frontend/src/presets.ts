/** Deterministic demo presets — the exact Phase 1 scenario payloads. */

import type { DemoPreset } from "./types";

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: "low",
    label: "LOW RISK DEMO",
    description: "₹500 to a known beneficiary, normal behaviour and context.",
    features: {
      amount: 500,
      amount_to_user_average: 0.8,
      new_beneficiary: false,
      beneficiary_age_days: 900,
      transactions_last_hour: 0,
      transactions_last_24h: 2,
      unusual_transaction_time: false,
      session_change: false,
      suspicious_context: false,
    },
  },
  {
    id: "medium",
    label: "MEDIUM RISK DEMO",
    description:
      "Known beneficiary but ~4.5× average amount, 3 transactions in the last hour, unusual hour.",
    features: {
      amount: 15000,
      amount_to_user_average: 4.5,
      new_beneficiary: false,
      beneficiary_age_days: 300,
      transactions_last_hour: 3,
      transactions_last_24h: 6,
      unusual_transaction_time: true,
      session_change: false,
      suspicious_context: false,
    },
  },
  {
    id: "high",
    label: "HIGH RISK DEMO",
    description:
      "₹45,000 to a brand-new beneficiary, 15× average amount, velocity spike, suspicious context.",
    features: {
      amount: 45000,
      amount_to_user_average: 15.0,
      new_beneficiary: true,
      beneficiary_age_days: 0,
      transactions_last_hour: 5,
      transactions_last_24h: 12,
      unusual_transaction_time: true,
      session_change: true,
      suspicious_context: true,
    },
  },
];
