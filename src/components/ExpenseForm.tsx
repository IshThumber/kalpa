/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { MEMBERS } from "../constants/members";
import type { Expense, ExpenseDraft, FieldErrors, MemberId, SplitType } from "../types";
import { makeDefaultSplitInput } from "../utils/split";
import { validateExpense } from "../utils/validation";

const today = () => new Date().toISOString().slice(0, 10);
export const blankDraft = (): ExpenseDraft => ({
  date: today(),
  description: "",
  amount: 0,
  paidBy: "Ish",
  splitType: "Equal",
  splitBetween: MEMBERS.map((member) => member.id),
  splitInput: { type: "Equal" },
});
const asDraft = (expense: Expense): ExpenseDraft => ({
  date: expense.date,
  description: expense.description,
  amount: expense.amount,
  paidBy: expense.paidBy,
  splitType: expense.splitType,
  splitBetween: expense.splitBetween,
  splitInput: expense.splitInput,
});

export function ExpenseForm({
  editing,
  onSave,
  onCancel,
}: {
  editing: Expense | null;
  onSave: (draft: ExpenseDraft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ExpenseDraft>(editing ? asDraft(editing) : blankDraft());
  const [errors, setErrors] = useState<FieldErrors>({});
  useEffect(() => {
    setDraft(editing ? asDraft(editing) : blankDraft());
    setErrors({});
  }, [editing]);
  const update = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const changeSplitType = (splitType: SplitType) =>
    setDraft((current) => ({ ...current, splitType, splitInput: makeDefaultSplitInput(splitType) }));
  const toggleMember = (id: MemberId) =>
    setDraft((current) => ({
      ...current,
      splitBetween: current.splitBetween.includes(id)
        ? current.splitBetween.filter((member) => member !== id)
        : [...current.splitBetween, id],
    }));
  const updateSplitValue = (id: MemberId, value: number) =>
    setDraft((current) => {
      const input = current.splitInput;
      if (input.type === "Custom")
        return { ...current, splitInput: { type: "Custom", amounts: { ...input.amounts, [id]: value } } };
      if (input.type === "Percentage")
        return { ...current, splitInput: { type: "Percentage", percentages: { ...input.percentages, [id]: value } } };
      if (input.type === "Shares")
        return { ...current, splitInput: { type: "Shares", weights: { ...input.weights, [id]: value } } };
      return current;
    });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateExpense(draft);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) onSave(draft);
  };
  const splitLabel =
    draft.splitInput.type === "Custom"
      ? "Amount (₹)"
      : draft.splitInput.type === "Percentage"
        ? "Percentage (%)"
        : "Weight";
  const valueOf = (id: MemberId) =>
    draft.splitInput.type === "Custom"
      ? draft.splitInput.amounts[id]
      : draft.splitInput.type === "Percentage"
        ? draft.splitInput.percentages[id]
        : draft.splitInput.type === "Shares"
          ? draft.splitInput.weights[id]
          : 0;
  return (
    <form className="expense-form" onSubmit={submit} noValidate>
      <div className="form-heading">
        <div>
          <span className="eyebrow">{editing ? "UPDATE A RECORD" : "NEW CONTRIBUTION"}</span>
          <h2>{editing ? "Edit expense" : "Record an expense"}</h2>
        </div>
        {editing && (
          <button type="button" className="text-button" onClick={onCancel}>
            Cancel edit
          </button>
        )}
      </div>
      <div className="form-grid">
        <Field label="Date" error={errors.date}>
          <input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} />
        </Field>
        <Field label="Amount" error={errors.amount}>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={draft.amount || ""}
            onChange={(event) => update("amount", Number(event.target.value))}
          />
        </Field>
        <Field label="Description" error={errors.description} className="wide">
          <input
            placeholder="Dinner, cab, supplies…"
            value={draft.description}
            onChange={(event) => update("description", event.target.value)}
          />
        </Field>
        <Field label="Paid by" error={errors.paidBy}>
          <select value={draft.paidBy} onChange={(event) => update("paidBy", event.target.value as MemberId)}>
            {MEMBERS.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset className="split-panel">
        <legend>How should this be split?</legend>
        <div className="split-types">
          {(["Equal", "Custom", "Percentage", "Shares"] as SplitType[]).map((type) => (
            <button
              type="button"
              key={type}
              className={draft.splitType === type ? "active" : ""}
              onClick={() => changeSplitType(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="member-picker">
          <div className="picker-title">
            Split between <span>Exclusions are okay</span>
          </div>
          <div className="member-checks">
            {MEMBERS.map((member) => (
              <label key={member.id} className={draft.splitBetween.includes(member.id) ? "checked" : ""}>
                <input
                  type="checkbox"
                  checked={draft.splitBetween.includes(member.id)}
                  onChange={() => toggleMember(member.id)}
                />
                <span className="checkbox-mark" />
                {member.name}
              </label>
            ))}
          </div>
          {errors.splitBetween && <span className="field-error">{errors.splitBetween}</span>}
        </div>
        {draft.splitType !== "Equal" && (
          <div className="split-values">
            <div className="split-values-head">
              <span>Fine tune the split</span>
              <b>{splitLabel}</b>
            </div>
            {MEMBERS.filter((member) => draft.splitBetween.includes(member.id)).map((member) => (
              <label key={member.id}>
                <span>{member.name}</span>
                <input
                  type="number"
                  min="0"
                  step={draft.splitType === "Custom" ? "0.01" : "0.1"}
                  value={valueOf(member.id) || ""}
                  onChange={(event) => updateSplitValue(member.id, Number(event.target.value))}
                />
              </label>
            ))}
            {errors.splitInput && <span className="field-error">{errors.splitInput}</span>}
          </div>
        )}
      </fieldset>
      <button className="primary-button submit-button" type="submit">
        {editing ? "Save changes" : "Add expense"} <span>→</span>
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
export function expenseFromChat(amount: number, paidBy: MemberId, description: string): ExpenseDraft {
  return {
    ...blankDraft(),
    amount,
    paidBy,
    description,
    splitBetween: MEMBERS.map((member) => member.id),
    splitInput: { type: "Equal" },
  };
}
