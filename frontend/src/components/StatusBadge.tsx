/** Risk level badge with status dot — one style used everywhere. */

interface StatusBadgeProps {
  level: "LOW" | "MEDIUM" | "HIGH";
}

const LABELS: Record<string, string> = {
  LOW: "Low Risk",
  MEDIUM: "Medium Risk",
  HIGH: "High Risk",
};

export function StatusBadge({ level }: StatusBadgeProps) {
  return (
    <span className={`badge badge-${level.toLowerCase()}`}>
      <span className={`risk-dot dot-${level.toLowerCase()}`} aria-hidden="true" />
      {LABELS[level]}
    </span>
  );
}
