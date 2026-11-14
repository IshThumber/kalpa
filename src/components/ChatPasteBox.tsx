import { useState } from "react";
import type { ExpenseDraft } from "../types";
import { parseChat } from "../utils/parser";
import { expenseFromChat } from "./ExpenseForm";

export function ChatPasteBox({ onAdd }: { onAdd: (draft: ExpenseDraft) => void }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseChat> | null>(null);
  const inspect = () => setParsed(parseChat(text));
  return (
    <section className="chat-box">
      <div>
        <span className="eyebrow">OPTIONAL SHORTCUT</span>
        <h2>Paste a group chat note</h2>
        <p>We’ll only surface entries with one clear amount and payer. Everything else stays for manual review.</p>
      </div>
      <textarea
        aria-label="Chat-style expense notes"
        placeholder={"“Ish paid ₹850 for snacks”\n“Devansh 1200 cab”"}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setParsed(null);
        }}
      />
      <button className="outline-button" type="button" onClick={inspect}>
        Review lines
      </button>
      {parsed && (
        <div className="parse-result">
          {parsed.candidates.map((entry) => (
            <div key={entry.raw}>
              <span>
                ✓ {entry.description} · ₹{entry.amount} by {entry.paidBy}
              </span>
              <button
                type="button"
                onClick={() => onAdd(expenseFromChat(entry.amount, entry.paidBy!, entry.description))}
              >
                Add
              </button>
            </div>
          ))}
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
