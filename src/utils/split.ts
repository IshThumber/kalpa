import { MEMBER_IDS, emptyMemberRecord } from "../constants/members";
import type { MemberId, SplitInput } from "../types";
import { fromCents, toCents } from "./money";

const ordered = (ids: MemberId[]) => MEMBER_IDS.filter((id) => ids.includes(id));

/** Largest-remainder allocation in cents, deterministic by canonical member order. */
export function allocateShares(amount: number, raw: Record<MemberId, number>, ids: MemberId[]) {
  const totalCents = toCents(amount);
  const rows = ordered(ids).map((id, index) => {
    const rawCents = raw[id] * 100;
    const floor = Math.floor(rawCents + 1e-9);
    return { id, index, floor, remainder: rawCents - floor };
  });
  let remaining = totalCents - rows.reduce((sum, row) => sum + row.floor, 0);
  rows.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; remaining > 0; index += 1, remaining -= 1) rows[index % rows.length].floor += 1;
  const result = emptyMemberRecord(0);
  rows.forEach((row) => { result[row.id] = fromCents(row.floor); });
  return result;
}

export function calculateShares(amount: number, splitBetween: MemberId[], input: SplitInput) {
  const ids = ordered(splitBetween);
  if (!ids.length) throw new Error("Choose at least one member to split with.");
  const raw = emptyMemberRecord(0);
  if (input.type === "Custom") {
    ids.forEach((id) => { raw[id] = Number(input.amounts[id] ?? 0); });
    if (toCents(ids.reduce((sum, id) => sum + raw[id], 0)) !== toCents(amount)) throw new Error("Custom amounts must equal the expense total.");
    return raw;
  }
  if (input.type === "Equal") ids.forEach((id) => { raw[id] = amount / ids.length; });
  if (input.type === "Percentage") {
    const total = ids.reduce((sum, id) => sum + Number(input.percentages[id] ?? 0), 0);
    if (Math.abs(total - 100) > 0.000001) throw new Error("Percentages must total 100%.");
    ids.forEach((id) => { raw[id] = amount * Number(input.percentages[id] ?? 0) / 100; });
  }
  if (input.type === "Shares") {
    const totalWeight = ids.reduce((sum, id) => sum + Number(input.weights[id] ?? 0), 0);
    if (ids.some((id) => Number(input.weights[id] ?? 0) <= 0) || totalWeight <= 0) throw new Error("Every selected member needs a positive share weight.");
    ids.forEach((id) => { raw[id] = amount * Number(input.weights[id]) / totalWeight; });
  }
  return allocateShares(amount, raw, ids);
}

export const makeDefaultSplitInput = (type: SplitInput["type"] = "Equal"): SplitInput => {
  if (type === "Custom") return { type, amounts: emptyMemberRecord(0) };
  if (type === "Percentage") return { type, percentages: emptyMemberRecord(0) };
  if (type === "Shares") return { type, weights: emptyMemberRecord(1) };
  return { type: "Equal" };
};
