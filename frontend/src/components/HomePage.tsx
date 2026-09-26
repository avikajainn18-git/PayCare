/**
 * PayCare Home — the product introduction / command center.
 * Answers in seconds: what is PayCare, what does it protect, how does it
 * work, where to try it, where threats appear. The Protection Overview
 * reads live data from GET /api/threat-events/summary — no fake numbers.
 */

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  BrainCircuit,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wallet2,
} from "lucide-react";
import { ApiError, getThreatSummary } from "../api";
import type { Tab } from "../nav";
import type { ThreatSummary } from "../types";

const FLOW_STEPS = [
  { label: "Payment", icon: Wallet2 },
  { label: "AI risk analysis", icon: BrainCircuit },
  { label: "Risk score", icon: Gauge },
  { label: "Intervention", icon: UserCheck },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Payment context",
    body: "Transaction + behaviour signals",
  },
  {
    step: "2",
    title: "AI risk analysis",
    body: "XGBoost + rules",
  },
  {
    step: "3",
    title: "Explainable risk",
    body: "Risk score + reasons",
  },
  {
    step: "4",
    title: "Pre-payment intervention",
    body: "Cancel or continue",
  },
];

const WHY_PAYCARE = [
  {
    icon: ArrowRightLeft,
    title: "Before payment",
    body: "Risk is assessed before the user authorizes the transaction.",
  },
  {
    icon: Sparkles,
    title: "Explainable",
    body: "Users see why a payment is considered unusual.",
  },
  {
    icon: UserCheck,
    title: "User in control",
    body: "PayCare warns and guides while leaving the final decision with the user.",
  },
];

export function HomePage({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const [summary, setSummary] = useState<ThreatSummary | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setSummaryError(false);
    try {
      setSummary(await getThreatSummary());
    } catch (err) {
      setSummaryError(err instanceof ApiError || err instanceof Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  return (
    <div className="home">
      {/* ---------------- hero ---------------- */}
      <section className="card home-hero">
        <div className="hero-copy">
          <span className="eyebrow">Pre-payment risk protection</span>
          <h1>Protect Before Payment.</h1>
          <p className="hero-tagline">Detect Risk Before It Becomes a Loss.</p>
          <p className="hero-desc">
            PayCare evaluates transaction and contextual signals before authorization, explains
            suspicious activity, and gives users a chance to stop a risky payment.
          </p>
          <div className="hero-ctas">
            <button className="btn btn-primary" onClick={() => onNavigate("simulator")}>
              <Wallet2 size={17} strokeWidth={2.2} />
              CHECK A PAYMENT
            </button>
            <button className="btn btn-secondary" onClick={() => onNavigate("dashboard")}>
              VIEW THREAT DASHBOARD
            </button>
          </div>
        </div>

        <div className="hero-flow" aria-hidden="true">
          {FLOW_STEPS.map(({ label, icon: Icon }, index) => (
            <div key={label} className="hero-flow-item">
              <div className="hero-flow-card">
                <span className="hero-flow-icon">
                  <Icon size={19} strokeWidth={2} />
                </span>
                <span>{label}</span>
              </div>
              {index < FLOW_STEPS.length - 1 && (
                <ArrowRight size={15} strokeWidth={2} className="hero-flow-arrow" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- how it works ---------------- */}
      <section className="home-section">
        <h2 className="dash-card-title">How PayCare Works</h2>
        <p className="dash-card-sub">From payment intent to an explained decision</p>
        <div className="how-grid">
          {HOW_IT_WORKS.map(({ step, title, body }) => (
            <div key={step} className="card how-card">
              <span className="how-step">{step}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- protection overview ---------------- */}
      <section className="home-section">
        <div className="overview-head">
          <div>
            <h2 className="dash-card-title">Protection Overview</h2>
            <p className="dash-card-sub">Live from the PayCare threat store</p>
          </div>
        </div>
        {loading ? (
          <div className="card loading">
            <div className="spinner" aria-hidden="true" />
            <p>Loading protection overview…</p>
          </div>
        ) : summaryError || !summary ? (
          <div className="card error-banner" role="alert">
            <p>Could not load the protection overview.</p>
            <button className="btn btn-secondary btn-sm" onClick={() => void loadSummary()}>
              Retry
            </button>
          </div>
        ) : (
          <div className="kpi-grid">
            <div className="card kpi">
              <span className="kpi-icon" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                <ShieldAlert size={20} strokeWidth={2} />
              </span>
              <div>
                <div className="kpi-value">{summary.total_events}</div>
                <div className="kpi-label">Total Threat Events</div>
              </div>
            </div>
            <div className="card kpi">
              <span className="kpi-icon" style={{ background: "var(--high-soft)", color: "var(--high)" }}>
                <AlertTriangle size={20} strokeWidth={2} />
              </span>
              <div>
                <div className="kpi-value">{summary.high_risk_events}</div>
                <div className="kpi-label">High-Risk Events</div>
              </div>
            </div>
            <div className="card kpi">
              <span className="kpi-icon" style={{ background: "var(--low-soft)", color: "var(--low)" }}>
                <ShieldCheck size={20} strokeWidth={2} />
              </span>
              <div>
                <div className="kpi-value">{summary.cancelled}</div>
                <div className="kpi-label">Cancelled</div>
              </div>
            </div>
            <div className="card kpi">
              <span className="kpi-icon" style={{ background: "var(--medium-soft)", color: "var(--medium)" }}>
                <ArrowRight size={20} strokeWidth={2} />
              </span>
              <div>
                <div className="kpi-value">{summary.continued}</div>
                <div className="kpi-label">Continued</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ---------------- why paycare ---------------- */}
      <section className="home-section">
        <h2 className="dash-card-title">Why PayCare?</h2>
        <p className="dash-card-sub">Warn + explain + user in control</p>
        <div className="why-grid">
          {WHY_PAYCARE.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card why-card">
              <span className="card-head-icon">
                <Icon size={19} strokeWidth={2} />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="card home-cta">
        <div>
          <h2>See PayCare in Action</h2>
          <p>Run a normal, unusual, or high-risk payment scenario and see how PayCare responds.</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate("simulator")}>
          TRY THE MVP
          <ArrowRight size={16} strokeWidth={2.2} />
        </button>
      </section>

      <footer className="footer">
        <small>
          PayCare MVP · Pre-Payment Risk Protection — prototype environment · No real payments are
          processed.
        </small>
      </footer>
    </div>
  );
}
