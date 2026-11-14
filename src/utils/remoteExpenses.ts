import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Expense } from "../types";
import { supabase } from "./supabase";

const TABLE = "expenses";

type ExpenseRow = {
  id: string;
  expense: Expense;
  updated_at: string;
};

export async function fetchRemoteExpenses(): Promise<Expense[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(TABLE).select("id, expense, updated_at").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ExpenseRow[]).map((row) => row.expense);
}

export async function saveRemoteExpense(expense: Expense) {
  if (!supabase) return;
  const { error } = await supabase.from(TABLE).upsert({ id: expense.id, expense }, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteRemoteExpense(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

export function subscribeToExpenses(onChange: () => void): RealtimeChannel | null {
  if (!supabase) return null;
  return supabase
    .channel("shared-expenses")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, onChange)
    .subscribe();
}
