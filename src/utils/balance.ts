import { MEMBER_IDS } from "../constants/members";
import type { Expense, NetBalance } from "../types";
import { fromCents, toCents } from "./money";

export function computeBalances(expenses: Expense[]): NetBalance[] {
  return MEMBER_IDS.map((memberId) => {
    const paid = expenses.filter((expense) => expense.paidBy === memberId).reduce((sum, expense) => sum + toCents(expense.amount), 0);
    const owed = expenses.reduce((sum, expense) => sum + toCents(expense.shares[memberId] ?? 0), 0);
    return { memberId, paid: fromCents(paid), owed: fromCents(owed), net: fromCents(paid - owed) };
  });
}
