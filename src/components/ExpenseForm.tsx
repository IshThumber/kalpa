/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { MEMBERS } from "../constants/members";
import type { Expense, ExpenseDraft, FieldErrors, MemberId, SplitType } from "../types";
import { formatMoney } from "../utils/money";
import { makeDefaultSplitInput } from "../utils/split";
import { validateExpense } from "../utils/validation";

const today = () => new Date().toISOString().slice(0, 10);
const QUICK_TAGS = ["Stay", "Train", "Cab", "Dinner", "Snacks"];

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
    setDraft((current) => ({
      ...current,
      splitType,
      splitInput: makeDefaultSplitInput(splitType),
    }));

  const toggleMember = (id: MemberId) =>
    setDraft((current) => ({
      ...current,
      splitBetween: current.splitBetween.includes(id)
        ? current.splitBetween.filter((member) => member !== id)
        : [...current.splitBetween, id],
    }));

  const selectAllMembers = () =>
    setDraft((current) => ({
      ...current,
      splitBetween: MEMBERS.map((m) => m.id),
    }));

  const updateSplitValue = (id: MemberId, value: number) =>
    setDraft((current) => {
      const input = current.splitInput;
      if (input.type === "Custom")
        return {
          ...current,
          splitInput: { type: "Custom", amounts: { ...input.amounts, [id]: value } },
        };
      if (input.type === "Percentage")
        return {
          ...current,
          splitInput: { type: "Percentage", percentages: { ...input.percentages, [id]: value } },
        };
      if (input.type === "Shares")
        return {
          ...current,
          splitInput: { type: "Shares", weights: { ...input.weights, [id]: value } },
        };
      return current;
    });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateExpense(draft);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) {
      onSave(draft);
      if (!editing) setDraft(blankDraft());
    }
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

  const activeMembers = MEMBERS.filter((m) => draft.splitBetween.includes(m.id));
  const allocatedSum = activeMembers.reduce((sum, m) => sum + (Number(valueOf(m.id)) || 0), 0);
  const equalPerPerson = activeMembers.length > 0 && draft.amount > 0 ? draft.amount / activeMembers.length : 0;

  return (
    <form className={`expense-form ${editing ? "is-editing" : ""}`} onSubmit={submit} noValidate>
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

        <Field label="Amount (₹)" error={errors.amount}>
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
            placeholder="Kalpa Hostel, Train, Fagu Stay…"
            value={draft.description}
            onChange={(event) => update("description", event.target.value)}
          />
          <div className="quick-tags">
            {QUICK_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                className="tag-chip"
                onClick={() => update("description", draft.description ? `${draft.description} ${tag}` : tag)}
              >
                + {tag}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Paid by" error={errors.paidBy} className="wide">
          <select value={draft.paidBy} onChange={(event) => update("paidBy", event.target.value as MemberId)}>
            {MEMBERS.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="split-panel" role="group" aria-labelledby="split-heading">
        <div className="split-panel-title" id="split-heading">
          How should this be split?
        </div>

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
            <span>
              Split between{" "}
              <em>
                ({draft.splitBetween.length} of {MEMBERS.length} selected)
              </em>
            </span>
            {draft.splitBetween.length < MEMBERS.length && (
              <button type="button" className="text-button" onClick={selectAllMembers}>
                Select all
              </button>
            )}
          </div>

          <div className="member-checks">
            {MEMBERS.map((member) => {
              const isChecked = draft.splitBetween.includes(member.id);
              return (
                <label key={member.id} className={isChecked ? "checked" : ""}>
                  <input type="checkbox" checked={isChecked} onChange={() => toggleMember(member.id)} />
                  {isChecked && <span className="check-indicator">✓</span>}
                  <span>{member.name}</span>
                </label>
              );
            })}
          </div>
          {errors.splitBetween && <span className="field-error">{errors.splitBetween}</span>}
        </div>

        {draft.splitType === "Equal" && activeMembers.length > 0 && draft.amount > 0 && (
          <div className="split-live-bar">
            <span>Equal share per selected member</span>
            <strong>{formatMoney(equalPerPerson)}</strong>
          </div>
        )}

        {draft.splitType !== "Equal" && (
          <div className="split-values">
            <div className="split-values-head">
              <span>Fine tune the split</span>
              <b>{splitLabel}</b>
            </div>
            {activeMembers.map((member) => (
              <label key={member.id} className="split-input-row">
                <span className="split-member-label">
                  <i style={{ background: member.color }} />
                  {member.name}
                </span>
                <input
                  type="number"
                  min="0"
                  step={draft.splitType === "Custom" ? "0.01" : "0.1"}
                  placeholder="0"
                  value={valueOf(member.id) || ""}
                  onChange={(event) => updateSplitValue(member.id, Number(event.target.value))}
                />
              </label>
            ))}

            <div className="split-live-bar">
              {draft.splitType === "Custom" && (
                <>
                  <span>Allocated total</span>
                  <strong className={Math.abs(allocatedSum - draft.amount) < 0.005 ? "text-credit" : "text-debt"}>
                    {formatMoney(allocatedSum)} / {formatMoney(draft.amount)}
                  </strong>
                </>
              )}
              {draft.splitType === "Percentage" && (
                <>
                  <span>Total percentage</span>
                  <strong className={Math.abs(allocatedSum - 100) < 0.01 ? "text-credit" : "text-debt"}>
                    {allocatedSum.toFixed(1)}% / 100%
                  </strong>
                </>
              )}
              {draft.splitType === "Shares" && (
                <>
                  <span>Total relative weight</span>
                  <strong>{allocatedSum} shares</strong>
                </>
              )}
            </div>

            {errors.splitInput && <span className="field-error">{errors.splitInput}</span>}
          </div>
        )}
      </div>

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
      <span className="field-label">{label}</span>
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
