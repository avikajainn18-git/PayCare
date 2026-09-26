/**
 * Payment simulator — fintech-style two-column layout.
 * Left: the payment card (amount, beneficiary, new/existing, age).
 * Right: context & behaviour signals as elegant switches/inputs.
 * Emits the exact same payload shape as before — no contract changes.
 */

import { IndianRupee, Send, Timer, Wallet2 } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import type { PaymentFeatures } from "../types";

interface PaymentFormProps {
  features: PaymentFeatures;
  onChange: (features: PaymentFeatures) => void;
  onSubmit: (features: PaymentFeatures) => void;
  disabled?: boolean;
  onPreset: (presetId: string) => void;
  presets: { id: string; label: string; description: string }[];
  validationError: string | null;
}

function Switch({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="switch-row">
      <span>{label}</span>
      <span className="switch">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
        />
        <span className="switch-track" aria-hidden="true" />
      </span>
    </label>
  );
}

const PRESET_DOTS: Record<string, string> = {
  low: "dot-low",
  medium: "dot-medium",
  high: "dot-high",
};

export function PaymentForm({
  features,
  onChange,
  onSubmit,
  disabled = false,
  onPreset,
  presets,
  validationError,
}: PaymentFormProps) {
  function update(patch: Partial<PaymentFeatures>) {
    onChange({ ...features, ...patch });
  }

  function handleNewBeneficiary(isNew: boolean) {
    // Keep beneficiary age semantically consistent: a brand-new beneficiary
    // has age 0; switching back to existing gets a plausible default.
    if (isNew) {
      update({ new_beneficiary: true, beneficiary_age_days: 0 });
    } else {
      update({
        new_beneficiary: false,
        beneficiary_age_days: features.beneficiary_age_days === 0 ? 300 : features.beneficiary_age_days,
      });
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(features);
  }

  function num(field: keyof PaymentFeatures) {
    return String(features[field]);
  }

  function setNumber(field: keyof PaymentFeatures, raw: string, fallback = 0) {
    const value = raw === "" ? fallback : Number(raw);
    update({ [field]: Number.isNaN(value) ? fallback : value } as Partial<PaymentFeatures>);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="preset-row">
        <span className="eyebrow">Quick demo</span>
        <div className="preset-pills">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="preset-pill"
              disabled={disabled}
              onClick={() => onPreset(preset.id)}
              title={preset.description}
            >
              <span className={`risk-dot ${PRESET_DOTS[preset.id] ?? ""}`} aria-hidden="true" />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {validationError && <p className="form-error">{validationError}</p>}

      <div className="sim-grid">
        <section className="card">
          <div className="card-head">
            <span className="card-head-icon">
              <Send size={18} strokeWidth={2} />
            </span>
            <div>
              <h2>Payment details</h2>
              <p>Who is receiving this transfer</p>
            </div>
          </div>

          <div className="field-stack">
            <label className="field">
              <span>Amount</span>
              <div className="input-prefix">
                <span aria-hidden="true">₹</span>
                <input
                  type="number"
                  min={1}
                  step="any"
                  value={num("amount")}
                  disabled={disabled}
                  onChange={(e) => setNumber("amount", e.target.value)}
                  required
                />
              </div>
            </label>

            <label className="field">
              <span>Beneficiary</span>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                disabled={disabled}
                tabIndex={-1}
                aria-hidden="true"
              />
              <small>Illustrative only — the risk engine never sees this name.</small>
            </label>

            <Switch
              label="New beneficiary"
              checked={features.new_beneficiary}
              onChange={handleNewBeneficiary}
              disabled={disabled}
            />

            <label className="field">
              <span>Beneficiary age</span>
              <div className="input-prefix">
                <span aria-hidden="true">
                  <Wallet2 size={15} strokeWidth={2} />
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={num("beneficiary_age_days")}
                  disabled={disabled || features.new_beneficiary}
                  onChange={(e) => setNumber("beneficiary_age_days", e.target.value)}
                />
              </div>
              <small>Days since this beneficiary was added</small>
            </label>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <span className="card-head-icon">
              <Timer size={18} strokeWidth={2} />
            </span>
            <div>
              <h2>Context &amp; behaviour</h2>
              <p>Signals around this payment</p>
            </div>
          </div>

          <div className="field-stack">
            <div className="field-row">
              <label className="field">
                <span>Amount vs normal</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={num("amount_to_user_average")}
                  disabled={disabled}
                  onChange={(e) => setNumber("amount_to_user_average", e.target.value)}
                />
                <small>1.0 = exactly your usual amount</small>
              </label>
              <label className="field">
                <span>Transactions last hour</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={num("transactions_last_hour")}
                  disabled={disabled}
                  onChange={(e) => setNumber("transactions_last_hour", e.target.value)}
                />
              </label>
            </div>

            <label className="field">
              <span>Transactions last 24h</span>
              <input
                type="number"
                min={0}
                step={1}
                value={num("transactions_last_24h")}
                disabled={disabled}
                onChange={(e) => setNumber("transactions_last_24h", e.target.value)}
              />
            </label>

            <Switch
              label="Unusual transaction time"
              checked={features.unusual_transaction_time}
              onChange={(checked) => update({ unusual_transaction_time: checked })}
              disabled={disabled}
            />
            <Switch
              label="Session change"
              checked={features.session_change}
              onChange={(checked) => update({ session_change: checked })}
              disabled={disabled}
            />
            <Switch
              label="Suspicious context"
              checked={features.suspicious_context}
              onChange={(checked) => update({ suspicious_context: checked })}
              disabled={disabled}
            />
          </div>
        </section>
      </div>

      <button className="btn btn-primary btn-lg" type="submit" disabled={disabled}>
        <IndianRupee size={17} strokeWidth={2.2} />
        CHECK PAYMENT RISK
      </button>
    </form>
  );
}
