import { useMemo } from "react";
import { MEMBERS } from "../constants/members";
import { useExpenseContext } from "../context/ExpenseContext";
import { computeBalances } from "../utils/balance";
import { simplifyDebts } from "../utils/settlement";

export function useExpenses() {
  const context = useExpenseContext();
  return useMemo(() => {
    const balances = computeBalances(context.expenses);
    const settlements = simplifyDebts(balances);
    const total = context.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const paidCounts = Object.fromEntries(MEMBERS.map((member) => [member.id, context.expenses.filter((expense) => expense.paidBy === member.id).length]));
    return { ...context, balances, settlements, total, paidCounts };
  }, [context]);
}
