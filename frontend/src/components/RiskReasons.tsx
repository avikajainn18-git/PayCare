/** Bulleted explanation list — "Why are we warning you?" */

interface RiskReasonsProps {
  reasons: string[];
}

export function RiskReasons({ reasons }: RiskReasonsProps) {
  if (reasons.length === 0) return null;
  return (
    <div className="reasons">
      <h3>Why are we warning you?</h3>
      <ul>
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}
