/** "Why flagged" — explanation chips. Reused by result, intervention, and details. */

import { AlertTriangle } from "lucide-react";

interface RiskReasonsProps {
  reasons: string[];
  title?: string;
}

export function RiskReasons({ reasons, title = "Why this payment was flagged" }: RiskReasonsProps) {
  if (reasons.length === 0) return null;
  return (
    <div className="reasons-block">
      <span className="eyebrow">{title}</span>
      <ul className="reason-chips">
        {reasons.map((reason) => (
          <li key={reason} className="reason-chip">
            <AlertTriangle size={13} strokeWidth={2} aria-hidden="true" />
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
