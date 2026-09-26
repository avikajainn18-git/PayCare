/**
 * Slim icon-first navigation rail. Home (shield) is first and is the app's
 * default surface; simulator and dashboard are one click away. Selected
 * item gets the PayCare green treatment.
 */

import { House, ShieldCheck, Wallet2 } from "lucide-react";
import type { Tab } from "../nav";

const NAV_ITEMS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "simulator", label: "Payment Simulator", icon: Wallet2 },
  { id: "dashboard", label: "Threat Dashboard", icon: ShieldCheck },
];

export function Sidebar({ tab, onNavigate }: { tab: Tab; onNavigate: (tab: Tab) => void }) {
  return (
    <aside className="sidebar">
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
