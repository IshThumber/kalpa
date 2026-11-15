import { useState } from "react";
import { Link } from "react-router-dom";
import { MEMBERS } from "../constants/members";
import { useExpenses } from "../hooks/useExpenses";
import type { MemberId } from "../types";
import { formatMoney, formatWholeMoney } from "../utils/money";
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
        <span className="stat-label">{label}</span>
        <span className={`stat-icon ${tone}`}>{icon}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <div className="stat-note">{children}</div>
    </article>
  );
}

export function DashboardContent() {
  const { balances, expenses, total, paidCounts, settlements } = useExpenses();
  const [view, setView] = useState<"cards" | "compare">("cards");
  const [selectedMember, setSelectedMember] = useState<MemberId | null>(null);
  const [copied, setCopied] = useState(false);

  const top = [...balances].sort((a, b) => b.paid - a.paid)[0];
  const active = balances.filter((balance) => balance.paid > 0).length;
  const fairShare = total / MEMBERS.length;
  const settled = balances.every((balance) => balance.net === 0);

  const balanceOf = (id: MemberId) => balances.find((balance) => balance.memberId === id)!;
  const memberMeta = (id: MemberId) => MEMBERS.find((m) => m.id === id)!;

  const maxBarValue = Math.max(...balances.map((b) => Math.max(b.paid, b.owed)), 1);

  const visibleSettlements = selectedMember
    ? settlements.filter((s) => s.from === selectedMember || s.to === selectedMember)
    : settlements;

  const copySettlements = () => {
    if (!settlements.length) return;
    const text = [
      `Kalpa Trip Settlement (${formatMoney(total)} total):`,
      ...settlements.map((s) => `• ${s.from} pays ${s.to}: ${formatWholeMoney(s.amount)}`),
    ].join("\n");
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <section className="dashboard-hero">
        <div className="hero-text">
          <div className="eyebrow">
            <span className="sync-dot" /> KALPA TRIP · {MEMBERS.length} MEMBERS
          </div>
          <h1>Group expenses</h1>
          <p>
            <b>{expenses.length}</b> {expenses.length === 1 ? "expense" : "expenses"} · <b>{formatMoney(total)}</b>{" "}
            tracked · balances update automatically
          </p>
        </div>
        <Link className="primary-button" to="/ledger">
          <span>＋</span> Record expense
        </Link>
      </section>

      <section aria-label="Summary" className="stat-grid">
        <StatCard label="Group total" value={formatMoney(total)} icon={<WalletIcon />} tone="violet">
          {expenses.length} expense{expenses.length === 1 ? "" : "s"} <span className="muted-dot">•</span>{" "}
          <span className={settled ? "success-copy" : "warning-copy"}>
            {settled
              ? "Everyone is settled"
              : `${settlements.length} transfer${settlements.length === 1 ? "" : "s"} to settle`}
          </span>
        </StatCard>

        <StatCard
          label="Paid the most"
          value={top && top.paid > 0 ? top.memberId : "—"}
          icon={<ChartIcon />}
          tone="mint"
        >
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
          {MEMBERS.length - active === 0
            ? "All members have paid"
            : `${MEMBERS.length - active} member${MEMBERS.length - active === 1 ? " hasn’t" : "s haven’t"} paid yet`}
        </StatCard>

        <StatCard label="Average share" value={formatMoney(fairShare)} icon={<ReceiptIcon />} tone="amber">
          Equal-split benchmark per person
        </StatCard>
      </section>

      <section className="surface member-surface">
        <div className="section-heading">
          <div>
            <div className="heading-line">
              <h2>Member balances</h2>
              <span className="soft-pill">{MEMBERS.length} members</span>
              {selectedMember && (
                <button type="button" className="filter-reset-btn" onClick={() => setSelectedMember(null)}>
                  Showing {selectedMember} ✕
                </button>
              )}
            </div>
            <p>Paid, fair share, and net amount to settle. Click any card to filter transfers.</p>
          </div>

          <div className="view-toggle" role="group" aria-label="Balance view">
            <button type="button" onClick={() => setView("cards")} className={view === "cards" ? "active" : ""}>
              Cards
            </button>
            <button type="button" onClick={() => setView("compare")} className={view === "compare" ? "active" : ""}>
              Comparison
            </button>
          </div>
        </div>

        {view === "cards" ? (
          <div className="member-grid">
            {MEMBERS.map((member) => {
              const balance = balanceOf(member.id);
              const pct = total ? Math.min((balance.paid / total) * 100, 100) : 0;
              const isSelected = selectedMember === member.id;

              return (
                <article
                  className={`member-card ${isSelected ? "selected" : ""}`}
                  key={member.id}
                  onClick={() => setSelectedMember(isSelected ? null : member.id)}
                >
                  <div className="member-head">
                    <span
                      className="avatar"
                      style={{
                        color: member.color,
                        borderColor: `${member.color}35`,
                        backgroundColor: `${member.color}12`,
                      }}
                    >
                      {member.initials}
                    </span>
                    <div className="member-info">
                      <h3>{member.name}</h3>
                      <p>
                        {paidCounts[member.id]} payment{paidCounts[member.id] === 1 ? "" : "s"} <span>•</span>{" "}
                        {pct.toFixed(1)}% of total
                      </p>
                    </div>
                  </div>

                  <div className="card-rule" />

                  <div className="member-paid-block">
                    <span className="amount-label">Total paid so far</span>
                    <strong className="member-amount">{formatMoney(balance.paid)}</strong>
                  </div>

                  <div className="progress">
                    <span style={{ width: `${pct}%`, background: member.color }} />
                  </div>

                  <div className="member-foot">
                    <span className="fair-share-label">
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
          <div className="comparison-container">
            <div className="comparison-legend">
              <span>
                <i className="legend-swatch paid" /> Amount Paid
              </span>
              <span>
                <i className="legend-swatch owed" /> Fair Share Owed
              </span>
            </div>
            <div className="comparison-list">
              {MEMBERS.map((member) => {
                const b = balanceOf(member.id);
                return (
                  <div className="comparison-row" key={member.id}>
                    <div className="comparison-name">
                      <span
                        className="avatar avatar-sm"
                        style={{
                          color: member.color,
                          borderColor: `${member.color}35`,
                          backgroundColor: `${member.color}12`,
                        }}
                      >
                        {member.initials}
                      </span>
                      <div>
                        <strong>{member.name}</strong>
                        <small className={b.net > 0 ? "text-credit" : b.net < 0 ? "text-debt" : ""}>
                          {b.net === 0
                            ? "Settled"
                            : b.net > 0
                              ? `Gets ${formatMoney(b.net)}`
                              : `Owes ${formatMoney(Math.abs(b.net))}`}
                        </small>
                      </div>
                    </div>

                    <div className="comparison-bars">
                      <div className="bar-line">
                        <span
                          style={{
                            width: `${(b.paid / maxBarValue) * 100}%`,
                            background: member.color,
                          }}
                        />
                      </div>
                      <div className="bar-line owed">
                        <span style={{ width: `${(b.owed / maxBarValue) * 100}%` }} />
                      </div>
                    </div>

                    <div className="comparison-numbers">
                      <div>
                        <b>{formatMoney(b.paid)}</b> <small>paid</small>
                      </div>
                      <div>
                        <span>{formatMoney(b.owed)}</span> <small>share</small>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="surface settlement-section">
        <div className="section-heading settlement-head">
          <div>
            <div className="eyebrow">SETTLEMENTS</div>
            <h2>Settle up</h2>
            <p>
              {settlements.length
                ? "The fewest transfers needed to clear every balance."
                : "No transfers needed — everyone is square."}
            </p>
          </div>
          {settlements.length > 0 && (
            <button type="button" className="outline-button" onClick={copySettlements}>
              {copied ? "✓ Copied summary" : "Copy summary"}
            </button>
          )}
        </div>

        <div className="settlement-list">
          {visibleSettlements.length ? (
            visibleSettlements.map((item) => {
              const fromMeta = memberMeta(item.from);
              const toMeta = memberMeta(item.to);
              return (
                <div className="settlement-row" key={`${item.from}-${item.to}`}>
                  <div className="settlement-transfer">
                    <span className="party-pill">
                      <span
                        className="avatar avatar-sm"
                        style={{
                          color: fromMeta.color,
                          borderColor: `${fromMeta.color}35`,
                          backgroundColor: `${fromMeta.color}12`,
                        }}
                      >
                        {fromMeta.initials}
                      </span>
                      <span className="settler">{item.from}</span>
                    </span>

                    <span className="settle-arrow">pays →</span>

                    <span className="party-pill">
                      <span
                        className="avatar avatar-sm"
                        style={{
                          color: toMeta.color,
                          borderColor: `${toMeta.color}35`,
                          backgroundColor: `${toMeta.color}12`,
                        }}
                      >
                        {toMeta.initials}
                      </span>
                      <span className="settler recipient">{item.to}</span>
                    </span>
                  </div>

                  <strong className="settlement-amount">{formatWholeMoney(item.amount)}</strong>
                </div>
              );
            })
          ) : (
            <div className="all-clear">
              ✓&nbsp; {selectedMember ? `${selectedMember} has no pending transfers` : "Everything is settled"}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
