import { useState } from "react";
import { ChatPasteBox } from "../components/ChatPasteBox";
import { ExpenseForm } from "../components/ExpenseForm";
import { MEMBERS } from "../constants/members";
import { useExpenses } from "../hooks/useExpenses";
import type { Expense, ExpenseDraft, MemberId } from "../types";
import { formatMoney } from "../utils/money";

export function LedgerEntry() {
  const { expenses, dispatch } = useExpenses();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [search, setSearch] = useState("");
  const [payerFilter, setPayerFilter] = useState<MemberId | "ALL">("ALL");

  const save = (draft: ExpenseDraft) => {
    if (editing) dispatch({ type: "UPDATE_EXPENSE", id: editing.id, draft });
    else dispatch({ type: "ADD_EXPENSE", draft });
    setEditing(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditing(expense);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredExpenses = [...expenses]
    .filter((expense) => {
      const matchesPayer = payerFilter === "ALL" || expense.paidBy === payerFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        expense.description.toLowerCase().includes(query) ||
        expense.paidBy.toLowerCase().includes(query) ||
        expense.splitType.toLowerCase().includes(query);
      return matchesPayer && matchesSearch;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="page ledger-page" data-testid="ledger-entry">
      <div className="ledger-intro">
        <span className="eyebrow">GROUP LEDGER</span>
        <h1>
          The group’s <em>ledger.</em>
        </h1>
        <p>Add a contribution, set the exact split, or correct an existing record.</p>
      </div>

      <div className="ledger-layout">
        <ExpenseForm editing={editing} onSave={save} onCancel={() => setEditing(null)} />
        <aside className="ledger-aside">
          <div className="ledger-tip">
            <span className="tip-icon">✦</span>
            <p>
              <b>Fair by design.</b>
              <br />
              Every split rounds deterministically, so the total never drifts by a single paisa.
            </p>
          </div>
          <ChatPasteBox onAdd={(draft) => dispatch({ type: "ADD_EXPENSE", draft })} />
        </aside>
      </div>

      <section className="surface expense-history">
        <div className="history-heading">
          <div>
            <span className="eyebrow">
              {expenses.length} RECORD{expenses.length === 1 ? "" : "S"}
            </span>
            <h2>Expense history</h2>
          </div>

          <div className="history-toolbar">
            {expenses.length > 0 && (
              <>
                <input
                  type="search"
                  className="history-search-input"
                  placeholder="Search expense or payer…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  aria-label="Filter by payer"
                  className="history-filter-select"
                  value={payerFilter}
                  onChange={(e) => setPayerFilter(e.target.value as MemberId | "ALL")}
                >
                  <option value="ALL">All payers</option>
                  {MEMBERS.map((m) => (
                    <option key={m.id} value={m.id}>
                      Paid by {m.name}
                    </option>
                  ))}
                </select>
              </>
            )}
            {editing && (
              <button className="text-button" onClick={() => setEditing(null)}>
                Stop editing
              </button>
            )}
          </div>
        </div>

        {expenses.length ? (
          <div className="expense-table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense</th>
                  <th>Paid by</th>
                  <th>Split</th>
                  <th>Amount</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className={editing?.id === expense.id ? "is-editing-row" : ""}>
                    <td data-label="Date" className="cell-date">
                      {new Intl.DateTimeFormat("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(`${expense.date}T00:00:00`))}
                    </td>
                    <td data-label="Expense" className="cell-expense">
                      <b>{expense.description}</b>
                      <small>
                        {expense.splitBetween.length === MEMBERS.length
                          ? `All ${MEMBERS.length} members`
                          : expense.splitBetween.join(", ")}
                      </small>
                    </td>
                    <td data-label="Paid by">
                      <span className="payer-cell">
                        <span className="payer-chip">{expense.paidBy.slice(0, 2).toUpperCase()}</span>
                        {expense.paidBy}
                      </span>
                    </td>
                    <td data-label="Split">
                      <span className="split-pill">{expense.splitType}</span>
                    </td>
                    <td data-label="Amount" className="cell-amount">
                      <b>{formatMoney(expense.amount)}</b>
                    </td>
                    <td className="row-actions" data-label="Actions">
                      <button type="button" onClick={() => handleEdit(expense)}>
                        Edit
                      </button>
                      <button
                        type="button"
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
