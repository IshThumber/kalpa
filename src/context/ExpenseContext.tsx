/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { createStarterExpenses } from "../constants/starterExpenses";
import type { Expense, ExpenseDraft } from "../types";
import { deleteRemoteExpense, fetchRemoteExpenses, saveRemoteExpense, subscribeToExpenses } from "../utils/remoteExpenses";
import { calculateShares } from "../utils/split";
import { completeStarterMigration, loadExpenses, needsStarterMigration, saveExpenses } from "../utils/storage";
import { isSupabaseConfigured, supabase } from "../utils/supabase";

type State = { expenses: Expense[] };
type Command =
  | { type: "ADD_EXPENSE"; draft: ExpenseDraft }
  | { type: "UPDATE_EXPENSE"; id: string; draft: ExpenseDraft }
  | { type: "DELETE_EXPENSE"; id: string };
type InternalAction =
  | { type: "UPSERT_EXPENSE"; expense: Expense }
  | { type: "DELETE_EXPENSE"; id: string }
  | { type: "REPLACE_EXPENSES"; expenses: Expense[] };
export type SyncStatus = "local" | "syncing" | "synced" | "error";
type ContextValue = State & { dispatch: Dispatch<Command>; syncStatus: SyncStatus };
const ExpenseContext = createContext<ContextValue | null>(null);

const materialize = (draft: ExpenseDraft, id: string): Expense => ({
  ...draft,
  id,
  amount: Math.round(draft.amount * 100) / 100,
  shares: calculateShares(draft.amount, draft.splitBetween, draft.splitInput),
});
const initialState = (): State => {
  const savedExpenses = loadExpenses();
  return {
    expenses: savedExpenses.length === 0 && needsStarterMigration() ? createStarterExpenses() : savedExpenses,
  };
};
function reducer(state: State, action: InternalAction): State {
  if (action.type === "UPSERT_EXPENSE") {
    const exists = state.expenses.some((expense) => expense.id === action.expense.id);
    return {
      ...state,
      expenses: exists
        ? state.expenses.map((expense) => (expense.id === action.expense.id ? action.expense : expense))
        : [action.expense, ...state.expenses],
    };
  }
  if (action.type === "DELETE_EXPENSE") return { ...state, expenses: state.expenses.filter((expense) => expense.id !== action.id) };
  if (action.type === "REPLACE_EXPENSES") return { ...state, expenses: action.expenses };
  return state;
}

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, initialState);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isSupabaseConfigured ? "syncing" : "local");

  useEffect(() => { saveExpenses(state.expenses); }, [state.expenses]);
  useEffect(() => { completeStarterMigration(); }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const hydrate = async () => {
      try {
        const remoteExpenses = await fetchRemoteExpenses();
        if (!active) return;
        if (remoteExpenses.length) {
          rawDispatch({ type: "REPLACE_EXPENSES", expenses: remoteExpenses });
        } else {
          await Promise.all(loadExpenses().map(saveRemoteExpense));
        }
        if (active) setSyncStatus("synced");
      } catch {
        if (active) setSyncStatus("error");
      }
    };
    void hydrate();
    const channel = subscribeToExpenses(() => { void hydrate(); });
    return () => {
      active = false;
      if (channel) void channel.unsubscribe();
    };
  }, []);

  const dispatch = useCallback<Dispatch<Command>>((command) => {
    if (command.type === "DELETE_EXPENSE") {
      rawDispatch(command);
      if (supabase) {
        setSyncStatus("syncing");
        void deleteRemoteExpense(command.id).then(() => setSyncStatus("synced")).catch(() => setSyncStatus("error"));
      }
      return;
    }
    const expense = materialize(command.draft, command.type === "UPDATE_EXPENSE" ? command.id : crypto.randomUUID());
    rawDispatch({ type: "UPSERT_EXPENSE", expense });
    if (supabase) {
      setSyncStatus("syncing");
      void saveRemoteExpense(expense).then(() => setSyncStatus("synced")).catch(() => setSyncStatus("error"));
    }
  }, []);

  const value = useMemo(() => ({ ...state, dispatch, syncStatus }), [state, dispatch, syncStatus]);
  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
}

export function useExpenseContext() {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error("useExpenseContext must be used inside ExpenseProvider");
  return context;
}
