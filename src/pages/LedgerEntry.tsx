import { useState } from "react";
import { ChatPasteBox } from "../components/ChatPasteBox";
import { ExpenseForm } from "../components/ExpenseForm";
import { useExpenses } from "../hooks/useExpenses";
import type { Expense, ExpenseDraft } from "../types";
import { formatMoney } from "../utils/money";

export function LedgerEntry() {
  const { expenses, dispatch } = useExpenses();
  const [editing, setEditing] = useState<Expense | null>(null);
  const save = (draft: ExpenseDraft) => {
    if (editing) dispatch({ type: "UPDATE_EXPENSE", id: editing.id, draft });
    else dispatch({ type: "ADD_EXPENSE", draft });
    setEditing(null);
  };
  return (
    <div className="page ledger-page" data-testid="ledger-entry">
      <div className="ledger-intro">
        <span className="eyebrow">ADMIN WORKSPACE</span>
        <h1>
          The group’s <em>ledger.</em>
        </h1>
        <p>Add a contribution, set the exact split, or correct an existing record.</p>
      </div>
      <div className="ledger-layout">
        <ExpenseForm editing={editing} onSave={save} onCancel={() => setEditing(null)} />
        <aside className="ledger-aside">
          <div className="ledger-tip">
            <span>✦</span>
            <p>
              <b>Fair by design.</b>
              <br />
              Every split rounds deterministically, so the total never drifts by a paisa.
            </p>
          </div>
          <ChatPasteBox onAdd={(draft) => dispatch({ type: "ADD_EXPENSE", draft })} />
        </aside>
      </div>
      <section className="expense-history">
        <div className="history-heading">
          <div>
            <span className="eyebrow">
              {expenses.length} RECORD{expenses.length === 1 ? "" : "S"}
            </span>
            <h2>Expense history</h2>
          </div>
          {editing && (
            <button className="text-button" onClick={() => setEditing(null)}>
              Stop editing
            </button>
          )}
        </div>
        {expenses.length ? (
          <div className="expense-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense</th>
                  <th>Paid by</th>
                  <th>Split</th>
                  <th>Amount</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...expenses]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((expense) => (
                    <tr key={expense.id}>
                      <td data-label="Date">
                        {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
                          new Date(`${expense.date}T00:00:00`),
                        )}
                      </td>
                      <td data-label="Expense">
                        <b>{expense.description}</b>
                        <small>{expense.splitBetween.join(", ")}</small>
                      </td>
                      <td data-label="Paid by">
                        <span className="payer-chip">{expense.paidBy.slice(0, 2).toUpperCase()}</span>
                        {expense.paidBy}
                      </td>
                      <td data-label="Split">{expense.splitType}</td>
                      <td data-label="Amount">
                        <b>{formatMoney(expense.amount)}</b>
                      </td>
                      <td className="row-actions" data-label="Actions">
                        <button onClick={() => setEditing(expense)}>Edit</button>
                        <button
                          className="delete"
                          onClick={() => {
                            if (window.confirm(`Delete “${expense.description}”?`))
                              dispatch({ type: "DELETE_EXPENSE", id: expense.id });
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-history">
            <span>◌</span>
            <h3>Nothing recorded yet</h3>
            <p>Your first expense will appear here, alongside its exact split.</p>
          </div>
        )}
      </section>
    </div>
  );
}
