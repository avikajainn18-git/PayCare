/** Loading state while the risk assessment runs. */

export function LoadingState() {
  return (
    <div className="card loading" role="status">
      <div className="spinner" aria-hidden="true" />
      <p>Assessing payment risk…</p>
    </div>
  );
}
