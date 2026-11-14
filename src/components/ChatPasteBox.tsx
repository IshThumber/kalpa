import { useState } from "react";
import type { ExpenseDraft } from "../types";
import { formatMoney } from "../utils/money";
import { parseChat } from "../utils/parser";
import { expenseFromChat } from "./ExpenseForm";

const SAMPLE_NOTE = "Ish paid ₹850 for snacks\nDevansh 1200 cab";

export function ChatPasteBox({ onAdd }: { onAdd: (draft: ExpenseDraft) => void }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseChat> | null>(null);
  const [addedList, setAddedList] = useState<string[]>([]);

  const inspect = () => {
    setParsed(parseChat(text));
    setAddedList([]);
  };

  return (
    <section className="chat-box">
      <div className="chat-header-row">
        <div>
          <span className="eyebrow">OPTIONAL SHORTCUT</span>
          <h2>Paste a group chat note</h2>
        </div>
        <button
          type="button"
          className="sample-pill-btn"
          onClick={() => {
            setText(SAMPLE_NOTE);
            setParsed(null);
          }}
        >
          Try sample
        </button>
      </div>

      <p className="chat-desc">
        We’ll surface entries with one clear amount and payer. Everything else stays flagged for manual review.
      </p>

      <textarea
        aria-label="Chat-style expense notes"
        placeholder={"“Ish paid ₹850 for snacks”\n“Devansh 1200 cab”"}
        rows={3}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setParsed(null);
        }}
      />

      <div className="chat-btn-row">
        <button className="outline-button" type="button" onClick={inspect}>
          Review lines
        </button>
        {text && (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setText("");
              setParsed(null);
            }}
          >
            Clear
          </button>
        )}
      </div>

      {parsed && (
        <div className="parse-result">
          {parsed.candidates.map((entry) => {
            const added = addedList.includes(entry.raw);
            return (
              <div className="parsed-item" key={entry.raw}>
                <span>
                  ✓ <b>{entry.description}</b> · {formatMoney(entry.amount)} by {entry.paidBy}
                </span>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => {
                    onAdd(expenseFromChat(entry.amount, entry.paidBy!, entry.description));
                    setAddedList((prev) => [...prev, entry.raw]);
                  }}
                >
                  {added ? "Added" : "Add"}
                </button>
              </div>
            );
          })}
          {parsed.flagged.map((entry) => (
            <div className="flagged" key={entry.raw}>
              <span>! “{entry.raw}”</span>
              <small>{entry.reason}</small>
            </div>
          ))}
          {!parsed.candidates.length && !parsed.flagged.length && <p>No lines to review.</p>}
        </div>
      )}
    </section>
  );
}
