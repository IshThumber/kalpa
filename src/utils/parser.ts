import { MEMBERS } from "../constants/members";
import type { ChatParseResult } from "../types";

export function parseChat(text: string): ChatParseResult {
  const candidates: ChatParseResult["candidates"] = []; const flagged: ChatParseResult["flagged"] = [];
  text.split("\n").map((line) => line.trim()).filter(Boolean).forEach((raw) => {
    const amounts = raw.match(/(?:₹|rs\.?\s*)?(\d+(?:\.\d{1,2})?)/gi) ?? [];
    const matchedMembers = MEMBERS.filter((member) => new RegExp(`\\b${member.name}\\b`, "i").test(raw));
    if (amounts.length !== 1 || matchedMembers.length !== 1) {
      flagged.push({ raw, reason: amounts.length !== 1 ? "I need one clear amount." : "I need one recognised payer." }); return;
    }
    const amount = Number(amounts[0].replace(/[^\d.]/g, ""));
    if (!amount) { flagged.push({ raw, reason: "Amount must be greater than zero." }); return; }
    const description = raw.replace(amounts[0], "").replace(matchedMembers[0].name, "").replace(/\b(paid|for|by)\b/gi, "").replace(/[-:,]/g, " ").trim() || "Chat expense";
    candidates.push({ raw, amount, paidBy: matchedMembers[0].id, description });
  });
  return { candidates, flagged };
}
