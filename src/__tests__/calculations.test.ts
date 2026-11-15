import { describe, expect, it } from "vitest";
import { emptyMemberRecord } from "../constants/members";
import type { Expense } from "../types";
import { computeBalances } from "../utils/balance";
import { simplifyDebts } from "../utils/settlement";
import { calculateShares } from "../utils/split";

describe("split calculations", () => {
  it("allocates equal-split leftover cents in canonical order", () => {
    const shares = calculateShares(100, ["Ankit", "Bhargav", "Devansh"], { type: "Equal" });
    expect(shares).toMatchObject({ Ankit: 33.34, Bhargav: 33.33, Devansh: 33.33 });
    expect(Object.values(shares).reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it("supports exclusions, percentages, custom values, and weighted shares", () => {
    expect(calculateShares(70, ["Ankit", "Sagar"], { type: "Percentage", percentages: { ...emptyMemberRecord(0), Ankit: 30, Sagar: 70 } })).toMatchObject({ Ankit: 21, Sagar: 49, Ish: 0 });
    expect(calculateShares(10, ["Ankit", "Bhargav"], { type: "Shares", weights: { ...emptyMemberRecord(0), Ankit: 1, Bhargav: 2 } })).toMatchObject({ Ankit: 3.33, Bhargav: 6.67 });
    expect(calculateShares(25, ["Ish", "Sagar"], { type: "Custom", amounts: { ...emptyMemberRecord(0), Ish: 7.25, Sagar: 17.75 } })).toMatchObject({ Ish: 7.25, Sagar: 17.75 });
  });

  it("rejects invalid percentage and shares inputs", () => {
    expect(() => calculateShares(10, ["Ankit", "Bhargav"], { type: "Percentage", percentages: { ...emptyMemberRecord(0), Ankit: 40, Bhargav: 40 } })).toThrow("Percentages");
    expect(() => calculateShares(10, ["Ankit", "Bhargav"], { type: "Shares", weights: { ...emptyMemberRecord(0), Ankit: 1, Bhargav: 0 } })).toThrow("positive");
  });
});

describe("balances and simplified settlements", () => {
  it("computes paid minus owed and settles in largest-balance order", () => {
    const expense: Expense = { id: "dinner", date: "2026-11-14", description: "Dinner", amount: 90, paidBy: "Ankit", splitType: "Equal", splitBetween: ["Ankit", "Bhargav", "Devansh"], splitInput: { type: "Equal" }, shares: { ...emptyMemberRecord(0), Ankit: 30, Bhargav: 30, Devansh: 30 } };
    const balances = computeBalances([expense]);
    expect(balances).toHaveLength(7);
    expect(balances.reduce((sum, balance) => sum + balance.net, 0)).toBe(0);
    expect(balances.find((balance) => balance.memberId === "Ankit")?.net).toBe(60);
    expect(simplifyDebts(balances)).toEqual([{ from: "Bhargav", to: "Ankit", amount: 30 }, { from: "Devansh", to: "Ankit", amount: 30 }]);
  });

  it("rounds settlement transfers to whole rupees without losing the rounded total", () => {
    const balances = [
      { memberId: "Ankit", paid: 0, owed: 0, net: 2.5 },
      { memberId: "Bhargav", paid: 0, owed: 0, net: -1.51 },
      { memberId: "Devansh", paid: 0, owed: 0, net: -0.99 },
      { memberId: "Dhvanil", paid: 0, owed: 0, net: 0 },
      { memberId: "Kashyap", paid: 0, owed: 0, net: 0 },
      { memberId: "Ish", paid: 0, owed: 0, net: 0 },
      { memberId: "Sagar", paid: 0, owed: 0, net: 0 },
    ] as const;

    const settlements = simplifyDebts([...balances]);
    expect(settlements).toEqual([
      { from: "Bhargav", to: "Ankit", amount: 2 },
      { from: "Devansh", to: "Ankit", amount: 1 },
    ]);
    expect(settlements.reduce((sum, settlement) => sum + settlement.amount, 0)).toBe(3);
  });
});
