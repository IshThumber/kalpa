import { NavLink, Outlet } from "react-router-dom";
import { WalletIcon } from "./Icons";

export function Layout() {
  return <div className="app-shell">
    <header className="topbar"><NavLink className="brand" to="/dashboard"><span className="brand-mark"><WalletIcon /></span><span>Splitwise<span className="brand-dot">.</span></span></NavLink>
      <nav aria-label="Primary navigation"><NavLink to="/dashboard">Overview</NavLink><NavLink to="/ledger">Ledger</NavLink></nav>
    </header><main><Outlet /></main>
  </div>;
}
