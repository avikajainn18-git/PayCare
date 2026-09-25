/** Risk level badge with distinct visual states. */

interface StatusBadgeProps {
  level: "LOW" | "MEDIUM" | "HIGH";
}

const LABELS: Record<string, string> = {
  LOW: "✓ LOW RISK",
  MEDIUM: "! MEDIUM RISK",
  HIGH: "⚠ HIGH RISK",
};

export function StatusBadge({ level }: StatusBadgeProps) {
  return <span className={`badge badge-${level.toLowerCase()}`}>{LABELS[level]}</span>;
}
