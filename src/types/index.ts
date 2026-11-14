export type MemberId = "Ankit" | "Bhargav" | "Devansh" | "Dhvanil" | "Kashyap" | "Ish" | "Sagar";

export type Member = { id: MemberId; name: string; initials: string; color: string };
export type SplitType = "Equal" | "Custom" | "Percentage" | "Shares";
export type SplitInput =
  | { type: "Equal" }
  | { type: "Custom"; amounts: Record<MemberId, number> }
  | { type: "Percentage"; percentages: Record<MemberId, number> }
  | { type: "Shares"; weights: Record<MemberId, number> };

export type Expense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  paidBy: MemberId;
  splitType: SplitType;
  splitBetween: MemberId[];
  shares: Record<MemberId, number>;
  splitInput: SplitInput;
};

export type ExpenseDraft = Omit<Expense, "id" | "shares">;
export type NetBalance = { memberId: MemberId; paid: number; owed: number; net: number };
export type Settlement = { from: MemberId; to: MemberId; amount: number };
export type FieldErrors = Partial<
  Record<"date" | "description" | "amount" | "paidBy" | "splitBetween" | "splitInput", string>
>;
export type ParsedExpense = { amount: number; paidBy: MemberId | null; description: string; raw: string };
export type FlaggedLine = { raw: string; reason: string };
export type ChatParseResult = { candidates: ParsedExpense[]; flagged: FlaggedLine[] };
