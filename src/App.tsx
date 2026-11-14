import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ExpenseProvider } from "./context/ExpenseContext";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { LedgerEntry } from "./pages/LedgerEntry";

/**
 * Root application component.
 *
 * Routing structure (per design):
 *   /            -> redirect to /dashboard
 *   /dashboard   -> Dashboard
 *   /ledger      -> LedgerEntry
 *   *            -> redirect to /dashboard
 *
 * All routes render inside a shared `<Layout />` (pathless layout route) which
 * provides the `<Outlet />` for nested pages. Everything is wrapped in an
 * `<ExpenseProvider />` which is a passthrough stub until Task 7.2.
 */
function App() {
  return (
    <BrowserRouter>
      <ExpenseProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="ledger" element={<LedgerEntry />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </ExpenseProvider>
    </BrowserRouter>
  );
}

export default App;
