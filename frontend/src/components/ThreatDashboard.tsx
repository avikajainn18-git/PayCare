/**
 * PayCare Threat Dashboard — what suspicious activity has PayCare recorded?
 * Reads live data from SQLite via the FastAPI threat-event endpoints.
 * No fake metrics: every number on screen comes from the API.
 */

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ApiError, getThreatSummary, listThreatEvents } from "../api";
import type { ThreatEvent, ThreatSummary } from "../types";
import { RiskReasons } from "./RiskReasons";
import { StatusBadge } from "./StatusBadge";

const LEVEL_COLORS: Record<string, string> = {
  LOW: "#16a06a",
  MEDIUM: "#d97706",
  HIGH: "#dc2626",
};

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function shortTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fullTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function SnapshotRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="snapshot-row">
      <div className="snapshot-top">
        <span>{label}</span>
        <b>{value}%</b>
      </div>
      <div className="snapshot-bar">
        <div className="snapshot-fill" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export function ThreatDashboard() {
  const [summary, setSummary] = useState<ThreatSummary | null>(null);
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [selected, setSelected] = useState<ThreatEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, eventData] = await Promise.all([
        getThreatSummary(),
        listThreatEvents(),
      ]);
      setSummary(summaryData);
      setEvents(eventData.events);
      setSelected((current) =>
        current
          ? eventData.events.find((e) => e.transaction_id === current.transaction_id) ?? null
          : null
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail ?? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="card loading" role="status">
        <div className="spinner" aria-hidden="true" />
        <p>Loading threat intelligence…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card error-banner" role="alert">
        <p>{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    );
  }

  const total = summary?.total_events ?? 0;

  const distribution = summary
    ? (["LOW", "MEDIUM", "HIGH"] as const).map((level) => ({
        level,
        count: summary.risk_distribution[level] ?? 0,
      }))
    : [];

  return (
    <div className="dashboard">
      <div className="page-head dash-welcome">
        <h1>Welcome back,</h1>
        <p className="dash-sub">PayCare Threat Intelligence — monitor suspicious payment activity and user decisions.</p>
      </div>

      <div className="kpi-grid">
        <div className="card kpi">
          <span className="kpi-icon" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            <ShieldAlert size={20} strokeWidth={2} />
          </span>
          <div>
            <div className="kpi-value">{summary?.total_events ?? 0}</div>
            <div className="kpi-label">Total Threat Events</div>
          </div>
        </div>
        <div className="card kpi">
          <span className="kpi-icon" style={{ background: "var(--high-soft)", color: "var(--high)" }}>
            <AlertTriangle size={20} strokeWidth={2} />
          </span>
          <div>
            <div className="kpi-value">{summary?.high_risk_events ?? 0}</div>
            <div className="kpi-label">High-Risk Events</div>
          </div>
        </div>
        <div className="card kpi">
          <span className="kpi-icon" style={{ background: "var(--low-soft)", color: "var(--low)" }}>
            <ShieldCheck size={20} strokeWidth={2} />
          </span>
          <div>
            <div className="kpi-value">{summary?.cancelled ?? 0}</div>
            <div className="kpi-label">Cancelled</div>
          </div>
        </div>
        <div className="card kpi">
          <span className="kpi-icon" style={{ background: "var(--medium-soft)", color: "var(--medium)" }}>
            <ArrowRight size={20} strokeWidth={2} />
          </span>
          <div>
            <div className="kpi-value">{summary?.continued ?? 0}</div>
            <div className="kpi-label">Continued</div>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <section className="card">
          <h2 className="dash-card-title">Risk level distribution</h2>
          <p className="dash-card-sub">Recorded threat events by risk level</p>
          {total > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={distribution} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                <CartesianGrid stroke="#eef0ec" vertical={false} />
                <XAxis dataKey="level" stroke="#6e7671" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="#6e7671" tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(22, 160, 106, 0.06)" }}
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    boxShadow: "var(--shadow-lift)",
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={72}>
                  {distribution.map((entry) => (
                    <Cell key={entry.level} fill={LEVEL_COLORS[entry.level]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <ShieldCheck size={26} strokeWidth={2} />
              </div>
              <h3>No threat events yet</h3>
              <p>High-risk payment decisions will appear here.</p>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="dash-card-title">Threat snapshot</h2>
          <p className="dash-card-sub">Share of recorded events</p>
          <SnapshotRow label="High-risk" value={pct(summary?.high_risk_events ?? 0, total)} color={LEVEL_COLORS.HIGH} />
          <SnapshotRow label="Cancelled" value={pct(summary?.cancelled ?? 0, total)} color={LEVEL_COLORS.LOW} />
          <SnapshotRow label="Continued" value={pct(summary?.continued ?? 0, total)} color={LEVEL_COLORS.MEDIUM} />
        </section>
      </div>

      <section className="card">
        <div className="table-head">
          <div>
            <h2>Recent threat events</h2>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => void refresh()}>
            <RefreshCw size={14} strokeWidth={2} />
            Refresh
          </button>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <ShieldCheck size={26} strokeWidth={2} />
            </div>
            <h3>No threat events yet</h3>
            <p>High-risk payment decisions will appear here.</p>
          </div>
        ) : (
          <table className="events-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Time</th>
                <th>Risk</th>
                <th>Decision</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.transaction_id}
                  className={selected?.transaction_id === event.transaction_id ? "selected" : ""}
                  onClick={() => setSelected(event)}
                >
                  <td className="txn-id">{event.transaction_id}</td>
                  <td className="cell-muted">{shortTime(event.timestamp)}</td>
                  <td>
                    <StatusBadge level={event.risk_level} />
                  </td>
                  <td>
                    <span className={`badge badge-${event.user_decision.toLowerCase()}`}>
                      {event.user_decision}
                    </span>
                  </td>
                  <td className="cell-score">{event.risk_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selected && (
        <section className="card event-details">
          <h2 className="dash-card-title">Event detail</h2>
          <dl className="detail-grid">
            <div>
              <dt>Transaction</dt>
              <dd>{selected.transaction_id}</dd>
            </div>
            <div>
              <dt>Timestamp</dt>
              <dd>{fullTime(selected.timestamp)}</dd>
            </div>
            <div>
              <dt>Risk Score</dt>
              <dd>{selected.risk_score}/100</dd>
            </div>
            <div>
              <dt>Risk Level</dt>
              <dd>{selected.risk_level}</dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>{selected.action}</dd>
            </div>
            <div>
              <dt>Decision</dt>
              <dd>{selected.user_decision}</dd>
            </div>
          </dl>
          <RiskReasons reasons={selected.reasons} title="Why flagged" />
          <p className="detail-meta">
            Model score {selected.ml_score} · Rule score {selected.rule_score} — simulated event; the
            transaction ID identifies the demo scenario, not a real UPI payment.
          </p>
        </section>
      )}
    </div>
  );
}
