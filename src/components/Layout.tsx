import { NavLink, Outlet } from "react-router-dom";
import { WalletIcon } from "./Icons";

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink className="brand" to="/dashboard">
            <span className="brand-mark">
              <WalletIcon />
            </span>
            <span className="brand-name">
              Kalpa<span className="brand-dot">.</span>
            </span>
            <span className="brand-badge">Trip Ledger</span>
          </NavLink>

          <nav className="topbar-nav" aria-label="Primary navigation">
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              Overview
            </NavLink>
            <NavLink to="/ledger" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              Ledger
            </NavLink>
          </nav>

          <div className="topbar-cta">
            <NavLink className="primary-button topbar-add-btn" to="/ledger">
              <span>＋</span> Add expense
            </NavLink>
          </div>
        </div>
      </header>

      <main className="main-container">
        <Outlet />
      </main>
    </div>
  );
}
