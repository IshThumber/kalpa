import { MEMBER_IDS } from "../constants/members";
import type { ExpenseDraft, FieldErrors } from "../types";
import { toCents } from "./money";

export function validateExpense(draft: ExpenseDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.date) errors.date = "Choose an expense date.";
  if (!draft.description.trim()) errors.description = "Add a short description.";
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) errors.amount = "Enter an amount greater than zero.";
  if (!MEMBER_IDS.includes(draft.paidBy)) errors.paidBy = "Choose who paid.";
  if (!draft.splitBetween.length) errors.splitBetween = "Choose at least one member.";
  const selected = draft.splitBetween;
  const splitInput = draft.splitInput;
  if (splitInput.type === "Percentage") {
    const sum = selected.reduce((total, id) => total + Number(splitInput.percentages[id] ?? 0), 0);
    if (Math.abs(sum - 100) > 0.000001) errors.splitInput = `Percentages add up to ${sum}%; they must total 100%.`;
  }
  if (splitInput.type === "Shares" && selected.some((id) => Number(splitInput.weights[id] ?? 0) <= 0)) errors.splitInput = "Each selected member needs a weight above zero.";
  if (splitInput.type === "Custom") {
    const sum = selected.reduce((total, id) => total + Number(splitInput.amounts[id] ?? 0), 0);
    if (toCents(sum) !== toCents(draft.amount)) errors.splitInput = "Custom amounts must exactly match the total.";
  }
  return errors;
}
