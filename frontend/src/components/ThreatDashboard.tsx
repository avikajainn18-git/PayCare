/**
 * PayCare Threat Dashboard — what suspicious activity has PayCare recorded?
 * Reads live data from SQLite via the FastAPI threat-event endpoints.
 * Intentionally lightweight: metrics, one distribution chart, recent events.
 */

import { useCallback, useEffect, useState } from "react";
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

const LEVEL_COLORS: Record<string, string> = {
  LOW: "#2fbf71",
  MEDIUM: "#f5b32e",
  HIGH: "#ff5c5c",
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
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
        current ? eventData.events.find((e) => e.transaction_id === current.transaction_id) ?? null : null
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
        <p>Loading threat dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card error" role="alert">
        <h2>Dashboard unavailable</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button className="primary" onClick={() => void refresh()}>
            RETRY
          </button>
        </div>
      </div>
    );
  }

  const distribution =
    summary?.risk_distribution &&
    (["LOW", "MEDIUM", "HIGH"] as const).map((level) => ({
      level,
      count: summary.risk_distribution[level] ?? 0,
    }));

  return (
    <div className="dashboard">
      <div className="metric-grid">
        <div className="card metric">
          <span className="metric-value">{summary?.total_events ?? 0}</span>
          <span className="metric-label">Total Threat Events</span>
        </div>
        <div className="card metric">
          <span className="metric-value metric-high">{summary?.high_risk_events ?? 0}</span>
          <span className="metric-label">High-Risk Events</span>
        </div>
        <div className="card metric">
          <span className="metric-value metric-low">{summary?.cancelled ?? 0}</span>
          <span className="metric-label">Cancelled</span>
        </div>
        <div className="card metric">
          <span className="metric-value metric-medium">{summary?.continued ?? 0}</span>
          <span className="metric-label">Continued</span>
        </div>
      </div>

      <div className="card dashboard-chart">
        <h2>Risk level distribution</h2>
        {summary && summary.total_events > 0 && distribution ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={distribution} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#1f2f4d" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="level" stroke="#8fa3c0" />
              <YAxis allowDecimals={false} stroke="#8fa3c0" />
              <Tooltip
                cursor={{ fill: "rgba(76, 154, 255, 0.08)" }}
                contentStyle={{ background: "#121c30", border: "1px solid #1f2f4d", borderRadius: 8 }}
                labelStyle={{ color: "#e6edf7" }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {distribution.map((entry) => (
                  <Cell key={entry.level} fill={LEVEL_COLORS[entry.level]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="empty-note">No threat events recorded yet.</p>
        )}
      </div>

      <div className="card">
        <div className="table-header">
          <h2>Recent threat events</h2>
          <button className="secondary refresh-btn" onClick={() => void refresh()}>
            REFRESH
          </button>
        </div>
        {events.length === 0 ? (
          <p className="empty-note">
            Nothing recorded yet. Run a HIGH-risk scenario in the simulator and cancel or continue —
            the decision will appear here.
          </p>
        ) : (
          <table className="events-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Timestamp</th>
                <th>Risk Score</th>
                <th>Level</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.transaction_id}
                  className={selected?.transaction_id === event.transaction_id ? "selected" : ""}
                  onClick={() => setSelected(event)}
                >
                  <td>{event.transaction_id}</td>
                  <td>{formatTimestamp(event.timestamp)}</td>
                  <td>{event.risk_score}/100</td>
                  <td>
                    <span className={`badge badge-${event.risk_level.toLowerCase()}`}>
                      {event.risk_level}
                    </span>
                  </td>
                  <td>{event.user_decision}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="card event-details">
          <h2>Event details</h2>
          <dl className="detail-grid">
            <div>
              <dt>Transaction ID</dt>
              <dd>{selected.transaction_id}</dd>
            </div>
            <div>
              <dt>Timestamp</dt>
              <dd>{formatTimestamp(selected.timestamp)}</dd>
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
              <dt>User Decision</dt>
              <dd>{selected.user_decision}</dd>
            </div>
          </dl>
          <RiskReasons reasons={selected.reasons} />
          <small className="simulator-note">
            Simulated event only — the transaction ID identifies the demo scenario, not a real UPI
            payment.
          </small>
        </div>
      )}
    </div>
  );
}
