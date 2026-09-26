/**
 * Compact top header: brand, contextual label, and an honest
 * "simulation" indicator. No invented authentication.
 */

export function TopHeader() {
  return (
    <header className="topbar">
      <div>
        <h1 className="brand-name">PayCare</h1>
        <p className="brand-sub">Pre-Payment Risk Protection</p>
      </div>
      <div className="topbar-right">
        <span className="sim-pill">
          <span className="live-dot" aria-hidden="true" />
          SIMULATION ENVIRONMENT
        </span>
      </div>
    </header>
  );
}
