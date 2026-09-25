/**
 * API client for the PayCare FastAPI backend.
 * The backend is the single source of truth — no risk logic here.
 */

import type { PaymentFeatures, RiskAssessment } from "./types";

const BASE_URL =
  (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? "http://127.0.0.1:8000";

/** Errors thrown by the API client. */
export class ApiError extends Error {
  readonly kind: "network" | "validation" | "server";
  readonly detail?: string;

  constructor(kind: "network" | "validation" | "server", detail?: string) {
    super(detail ?? kind);
    this.kind = kind;
    this.detail = detail;
  }
}

/** POST /api/assess-payment */
export async function assessPayment(features: PaymentFeatures): Promise<RiskAssessment> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/assess-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(features),
    });
  } catch {
    // fetch only throws on network-level failures
    throw new ApiError(
      "network",
      "Cannot reach the PayCare backend. Is the FastAPI server running on port 8000?"
    );
  }

  if (response.ok) {
    return (await response.json()) as RiskAssessment;
  }

  if (response.status === 422) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail?.[0]?.msg as string | undefined;
    throw new ApiError("validation", detail ?? "The payment details are invalid.");
  }
  if (response.status === 503) {
    throw new ApiError("server", "Risk engine is unavailable. Try again shortly.");
  }
  throw new ApiError("server", `Backend error (HTTP ${response.status}).`);
}
