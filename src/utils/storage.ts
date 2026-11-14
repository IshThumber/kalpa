import type { Expense } from "../types";

const EXPENSES_KEY = "kalpa:expenses";
const STARTER_MIGRATION_KEY = "kalpa:starter-ledger-v1";

export function loadExpenses(): Expense[] {
  try { const parsed = JSON.parse(localStorage.getItem(EXPENSES_KEY) ?? "[]"); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}
export const hasStoredExpenses = () => localStorage.getItem(EXPENSES_KEY) !== null;
/** True once for an existing empty ledger, so starter records can be migrated safely. */
export const needsStarterMigration = () =>
  localStorage.getItem(STARTER_MIGRATION_KEY) !== "complete";
export const completeStarterMigration = () =>
  localStorage.setItem(STARTER_MIGRATION_KEY, "complete");
export function saveExpenses(expenses: Expense[]) { localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses)); }
