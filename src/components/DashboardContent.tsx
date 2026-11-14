import { useState } from "react";
import { Link } from "react-router-dom";
import { MEMBERS } from "../constants/members";
import { useExpenses } from "../hooks/useExpenses";
import { formatMoney } from "../utils/money";
import { ChartIcon, PeopleIcon, ReceiptIcon, WalletIcon } from "./Icons";

function StatCard({
  label,
  value,
  children,
  icon,
  tone = "violet",
}: {
  label: string;
  value: React.ReactNode;
  children: React.ReactNode;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <div className="stat-note">{children}</div>
    </article>
  );
}

export function DashboardContent() {
  const { balances, expenses, total, paidCounts, settlements } = useExpenses();
  const [view, setView] = useState<"cards" | "compare">("cards");
  const top = [...balances].sort((a, b) => b.paid - a.paid)[0];
  const active = balances.filter((balance) => balance.paid > 0).length;
  const fairShare = total / MEMBERS.length;
  const settled = balances.every((balance) => balance.net === 0);
  const balanceOf = (id: (typeof MEMBERS)[number]["id"]) => balances.find((balance) => balance.memberId === id)!;
  return (
    <>
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow">
            <span className="sync-dot" /> KALPA TRIP · {MEMBERS.length} MEMBERS
          </div>
          <h1>Group expenses</h1>
          <p>{expenses.length} expenses · {formatMoney(total)} tracked · balances update as records change</p>
        </div>
        <Link className="primary-button" to="/ledger">
          <span>＋</span> Add expense
        </Link>
      </section>
      <section aria-label="Summary" className="stat-grid">
        <StatCard label="Group total" value={formatMoney(total)} icon={<WalletIcon />}>
          {expenses.length} expense{expenses.length === 1 ? "" : "s"} <span className="muted-dot">•</span>{" "}
          <span className="success-copy">{settled ? "Everyone is settled" : "Settlement needed"}</span>
        </StatCard>
        <StatCard label="Paid the most" value={top?.memberId ?? "—"} icon={<ChartIcon />} tone="mint">
          {top?.paid ? (
            <>
              <b>{formatMoney(top.paid)}</b> paid · {((top.paid / total) * 100).toFixed(1)}% of total
            </>
          ) : (
            "No payments recorded yet"
          )}
        </StatCard>
        <StatCard
          label="Active payers"
          value={
            <>
              {active}
              <small>/{MEMBERS.length}</small>
            </>
          }
          icon={<PeopleIcon />}
          tone="blue"
        >
          {MEMBERS.length - active} member{MEMBERS.length - active === 1 ? "" : "s"} haven’t paid yet
        </StatCard>
        <StatCard label="Average share" value={formatMoney(fairShare)} icon={<ReceiptIcon />} tone="amber">
          If every expense were split equally
        </StatCard>
      </section>
      <section className="surface member-surface">
        <div className="section-heading">
          <div>
            <div className="heading-line">
              <h2>Balances</h2>
              <span className="soft-pill">{MEMBERS.length} members</span>
            </div>
            <p>Paid, fair share, and the net amount each person needs to settle.</p>
          </div>
          <div className="view-toggle" role="group" aria-label="Balance view">
            <button onClick={() => setView("cards")} className={view === "cards" ? "active" : ""}>
              Cards
            </button>
            <button onClick={() => setView("compare")} className={view === "compare" ? "active" : ""}>
              Comparison
            </button>
          </div>
        </div>
        {view === "cards" ? (
          <div className="member-grid">
            {MEMBERS.map((member) => {
              const balance = balanceOf(member.id);
              const pct = total ? (balance.paid / total) * 100 : 0;
              return (
                <article className="member-card" key={member.id}>
                  <div className="member-head">
                    <span
                      className="avatar"
                      style={{
                        color: member.color,
                        borderColor: `${member.color}30`,
                        backgroundColor: `${member.color}10`,
                      }}
                    >
                      {member.initials}
                    </span>
                    <div>
                      <h3>{member.name}</h3>
                      <p>
                        {paidCounts[member.id]} payment{paidCounts[member.id] === 1 ? "" : "s"} <span>•</span>{" "}
                        {pct.toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                  <div className="card-rule" />
                  <span className="amount-label">Total paid so far</span>
                  <strong className="member-amount">{formatMoney(balance.paid)}</strong>
                  <div className="progress">
                    <span style={{ width: `${pct}%`, background: member.color }} />
                  </div>
                  <div className="member-foot">
                    <span>
                      Fair share: <b>{formatMoney(balance.owed)}</b>
                    </span>
                    {balance.net === 0 ? (
                      <span className="neutral-badge">Settled</span>
                    ) : (
                      <span className={balance.net > 0 ? "credit-badge" : "debt-badge"}>
                        {balance.net > 0 ? "↗ Gets back" : "↙ Owes"} {formatMoney(Math.abs(balance.net))}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="comparison-list">
            {MEMBERS.map((member) => {
              const b = balanceOf(member.id);
              const max = Math.max(total, 1);
              return (
                <div className="comparison-row" key={member.id}>
                  <span className="comparison-name">
                    <i style={{ background: member.color }} />
                    {member.name}
                  </span>
                  <div className="comparison-bars">
                    <div>
                      <span style={{ width: `${(b.paid / max) * 100}%`, background: member.color }} />
                    </div>
                    <div>
                      <span style={{ width: `${(b.owed / max) * 100}%` }} />
                    </div>
                  </div>
                  <span className="comparison-numbers">
                    {formatMoney(b.paid)} <small>paid</small>
                    <br />
                    {formatMoney(b.owed)} <small>share</small>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="settlement-section">
        <div>
          <div className="eyebrow">SETTLEMENTS</div>
          <h2>Settle up</h2>
          <p>
            {settlements.length
              ? "The fewest transfers needed to clear every balance."
              : "No transfers needed — everyone is square."}
          </p>
        </div>
        <div className="settlement-list">
          {settlements.length ? (
            settlements.map((item) => (
              <div className="settlement-row" key={`${item.from}-${item.to}`}>
                <span className="settler">{item.from}</span>
                <span className="settle-arrow">pays →</span>
                <span className="settler recipient">{item.to}</span>
                <b>{formatMoney(item.amount)}</b>
              </div>
            ))
          ) : (
            <div className="all-clear">✓&nbsp; Everything is settled</div>
          )}
        </div>
      </section>
    </>
  );
}
