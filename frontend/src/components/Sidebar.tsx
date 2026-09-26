/**
 * Slim icon-first navigation rail. Simulator is the default surface;
 * the dashboard is one click away. Selected item gets the PayCare
 * green treatment.
 */

import { ShieldCheck, Wallet2 } from "lucide-react";
import type { Tab } from "../nav";

const NAV_ITEMS: { id: Tab; label: string; icon: typeof Wallet2 }[] = [
  { id: "simulator", label: "Payment Simulator", icon: Wallet2 },
  { id: "dashboard", label: "Threat Dashboard", icon: ShieldCheck },
];

export function Sidebar({ tab, onNavigate }: { tab: Tab; onNavigate: (tab: Tab) => void }) {
  return (
    <aside className="sidebar">
      <div className="logo-mark" title="PayCare">
        <ShieldCheck size={22} strokeWidth={2.2} />
      </div>
      <nav className="side-nav" aria-label="PayCare sections">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={tab === id ? "nav-btn active" : "nav-btn"}
            title={label}
            aria-label={label}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon size={21} strokeWidth={2} />
          </button>
        ))}
      </nav>
      <div className="sidebar-foot" aria-hidden="true">
        <ShieldCheck size={16} strokeWidth={1.5} />
      </div>
    </aside>
  );
}
