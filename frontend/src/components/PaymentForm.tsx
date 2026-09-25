/**
 * Payment simulator form.
 * Sections: PAYMENT DETAILS, BEHAVIOUR & CONTEXT.
 * Uses toggles/number inputs — never raw true/false entry.
 */

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

function Toggle({
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
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

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
    <form className="card payment-form" onSubmit={handleSubmit}>
      <div className="presets">
        <span className="presets-label">Demo scenarios:</span>
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="preset-btn"
            disabled={disabled}
            onClick={() => onPreset(preset.id)}
            title={preset.description}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <h2>Payment details</h2>
      <div className="grid">
        <label className="field">
          <span>Amount (₹)</span>
          <input
            type="number"
            min={1}
            step="any"
            value={num("amount")}
            disabled={disabled}
            onChange={(e) => setNumber("amount", e.target.value)}
            required
          />
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
          <small>Illustrative only — not used by the risk engine in this prototype.</small>
        </label>
        <Toggle
          label="New beneficiary"
          checked={features.new_beneficiary}
          onChange={handleNewBeneficiary}
          disabled={disabled}
        />
        <label className="field">
          <span>Beneficiary age (days)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={num("beneficiary_age_days")}
            disabled={disabled || features.new_beneficiary}
            onChange={(e) => setNumber("beneficiary_age_days", e.target.value)}
          />
        </label>
      </div>

      <h2>Behaviour &amp; context</h2>
      <small className="context-note">
        Prototype context signals are simulated for MVP validation — nothing is collected from a
        phone.
      </small>
      <div className="grid">
        <label className="field">
          <span>Amount vs your normal (×)</span>
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
        <div className="toggles">
          <Toggle
            label="Unusual transaction time"
            checked={features.unusual_transaction_time}
            onChange={(checked) => update({ unusual_transaction_time: checked })}
            disabled={disabled}
          />
          <Toggle
            label="Session change"
            checked={features.session_change}
            onChange={(checked) => update({ session_change: checked })}
            disabled={disabled}
          />
          <Toggle
            label="Suspicious context"
            checked={features.suspicious_context}
            onChange={(checked) => update({ suspicious_context: checked })}
            disabled={disabled}
          />
        </div>
      </div>

      {validationError && <p className="form-error">{validationError}</p>}

      <button className="primary" type="submit" disabled={disabled}>
        CHECK PAYMENT RISK
      </button>
    </form>
  );
}
