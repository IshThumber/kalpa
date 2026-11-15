import { MEMBER_IDS } from "../constants/members";
import type { NetBalance, Settlement } from "../types";
import { fromCents, toCents } from "./money";

export function simplifyDebts(balances: NetBalance[]): Settlement[] {
  const order = (id: string) => MEMBER_IDS.indexOf(id as (typeof MEMBER_IDS)[number]);
  const creditors = balances.filter((balance) => balance.net > 0).map((b) => ({ id: b.memberId, cents: toCents(b.net) }));
  const debtors = balances.filter((balance) => balance.net < 0).map((b) => ({ id: b.memberId, cents: -toCents(b.net) }));
  const result: Settlement[] = [];
  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.cents - a.cents || order(a.id) - order(b.id));
    debtors.sort((a, b) => b.cents - a.cents || order(a.id) - order(b.id));
    const creditor = creditors[0]; const debtor = debtors[0]; const cents = Math.min(creditor.cents, debtor.cents);
    result.push({ from: debtor.id, to: creditor.id, amount: fromCents(cents) });
    creditor.cents -= cents; debtor.cents -= cents;
    if (!creditor.cents) creditors.shift();
    if (!debtor.cents) debtors.shift();
  }

  // Settlement suggestions are easier to pay as whole rupees. Allocate the
  // rounded-up rupees to the largest fractional remainders so the transfers
  // still add up to the rounded settlement total.
  const roundedTotal = Math.round(result.reduce((sum, settlement) => sum + settlement.amount, 0));
  const rounded = result.map((settlement, index) => ({
    ...settlement,
    index,
    amount: Math.floor(settlement.amount),
    remainder: settlement.amount - Math.floor(settlement.amount),
  }));
  const rupeesToAllocate = roundedTotal - rounded.reduce((sum, settlement) => sum + settlement.amount, 0);

  rounded
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .slice(0, rupeesToAllocate)
    .forEach((settlement) => {
      settlement.amount += 1;
    });

  return rounded.sort((a, b) => a.index - b.index).map(({ from, to, amount }) => ({ from, to, amount }));
}
