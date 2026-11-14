import type { Expense } from "../types";
import { calculateShares } from "../utils/split";
import { MEMBER_IDS } from "./members";

const STARTER_ROWS = [
  { description: "Kalpa Hostel", amount: 19580, paidBy: "Ish" },
  { description: "Train", amount: 10132, paidBy: "Devansh" },
  { description: "Train", amount: 6490, paidBy: "Devansh" },
  { description: "Train", amount: 13645, paidBy: "Ish" },
  { description: "Fagu Stay", amount: 12500, paidBy: "Ankit" },
  { description: "Narkanda Stay", amount: 9880, paidBy: "Ish" },
] as const;

/** The supplied reference ledger, shown on a fresh install only. */
export function createStarterExpenses(date = new Date().toISOString().slice(0, 10)): Expense[] {
  return STARTER_ROWS.map((row, index) => ({
    id: `starter-${index + 1}`,
    date,
    ...row,
    splitType: "Equal",
    splitBetween: [...MEMBER_IDS],
    splitInput: { type: "Equal" },
    shares: calculateShares(row.amount, MEMBER_IDS, { type: "Equal" }),
  }));
}
