# Design Document

## Overview

This document describes the architecture, data models, algorithms, component interfaces, correctness properties, and testing strategy for the Group Expense Tracker — a single-page React + TypeScript web application (no authentication) that lets a fixed group of seven members track shared expenses, compute balances, and simplify debts into minimal settlements.

### Goals

- Provide a polished, multi-page (route-based) React app that is not a spreadsheet.
- Implement four split types (Equal, Custom, Percentage, Shares) with deterministic, exact-to-the-cent rounding.
- Derive balances and minimal settlements via pure, unit-tested utility functions.
- Support two roles (Admin/User) via an in-app switcher with route-guarded Ledger Entry access.
- Persist expenses and role to `localStorage` and survive refresh.
- Match the Payment & Balance Dashboard reference UI with ₹ currency, member card grid, four stat cards, and Cards View / Paid vs Share Comparison toggle.

### Non-Goals

- Authentication, user accounts, or multi-tenant groups.
- Server-side persistence or sync; the app is fully client-side.
- Adding/renaming/removing members (the group is fixed at seven).
- Multi-currency or currency conversion.
- Storing settlement transactions; settlements are always derived from current expenses.
- Backward-compatible data migrations beyond the current schema version.

## Architecture

The application follows a unidirectional data flow:

```
User actions ──> Reducer (Context) ──> Expenses state ──> localStorage (persist)
                                              │
                                              ▼
                               Pure utilities (derive)
                          balances, settlements, summaries
                                              │
                                              ▼
                               Pages / Components (render)
```

- **State**: A single `ExpenseContext` (Context + `useReducer`) holds `expenses` and `role`. Balances and settlements are **derived**, not stored.
- **Utilities**: Pure functions in `src/utils/` for split calculation, rounding, balance, and settlement. No side effects, no React imports.
- **Routing**: React Router with a `RoleGuard` component protecting the Ledger Entry route.
- **Persistence**: A `storage` utility serializes/deserializes expenses and role to `localStorage` with a round-trip guarantee and corrupt-field-safe fallback.

### Project Structure

```
src/
├── main.tsx                  # Entry; mounts App with providers
├── App.tsx                   # Router + layout + role switcher
├── App.css
├── index.css
├── assets/
├── types/
│   └── index.ts              # Member, Expense, SplitType, Settlement, Role types
├── constants/
│   └── members.ts            # Fixed member list + canonical order
├── utils/
│   ├── split.ts              # Equal/Custom/Percentage/Shares split calculation
│   ├── rounding.ts           # Round-half-up + largest-remainder leftover allocation
│   ├── balance.ts            # Net balance computation
│   ├── settlement.ts         # Debt simplification (greedy largest match)
│   ├── parser.ts             # Chat-style text parser -> candidates + flagged lines
│   ├── serializer.ts         # Expense <-> JSON round-trip
│   ├── storage.ts            # localStorage read/write with corrupt-field fallback
│   └── validation.ts        # Expense validation rules
├── context/
│   ├── ExpenseContext.tsx    # Context + reducer provider
│   └── expenseReducer.ts     # Reducer: add/edit/delete/parse expenses, set role
├── hooks/
│   ├── useExpenses.ts        # Hook to consume ExpenseContext + derived balances
│   └── useRole.ts            # Hook to read/switch role
├── components/
│   ├── RoleSwitcher.tsx
│   ├── RoleGuard.tsx         # Route guard based on role
│   ├── Layout.tsx            # App shell: nav + role switcher + outlet
│   ├── NavBar.tsx
│   ├── DashboardHeader.tsx   # App title, synced badge, record expense CTA (admin only)
│   ├── StatCards.tsx         # Four summary stat cards (Total Paid, Top Payer, Active Payers, Equal Share)
│   ├── MemberCardGrid.tsx    # Responsive member card grid + view toggle (cards/comparison)
│   ├── MemberCard.tsx        # Member card: avatar, progress bar, status badge
│   ├── BalanceList.tsx       # Per-member net balances
│   ├── SettlementList.tsx    # Settlements table
│   ├── BalanceChart.tsx      # Visual breakdown
│   ├── ExpenseForm.tsx       # Create/edit form with validation + field errors
│   ├── ExpenseTable.tsx      # List of existing expenses (edit/delete)
│   ├── ChatPasteBox.tsx     # Paste + parse + flagged-line review
│   ├── SplitEditor.tsx       # UI for selecting splitType + splitBetween + amounts
│   └── ui/                   # Small primitives (Button, Card, Field, etc.)
├── pages/
│   ├── Dashboard.tsx         # Read-only overview
│   └── LedgerEntry.tsx       # Admin-only CRUD
└── __tests__/                # Test files (co-located)
    ├── split.test.ts
    ├── rounding.test.ts
    ├── balance.test.ts
    ├── settlement.test.ts
    ├── parser.test.ts
    ├── serializer.test.ts
    ├── storage.test.ts
    └── validation.test.ts
```

### Core Algorithm Design

#### Rounding (`utils/rounding.ts`)

`roundHalfUp(value, 2)`: rounds to 2 decimals using round-half-up.

`allocateLeftover(amount, rawShares)` (largest-remainder method):

1. Compute `rounded = rawShares.map(roundHalfUp)`.
2. Compute `remainder = rawShares.map(r => r - rounded)`.
3. Compute `leftoverCents = roundToCents(amount - sum(rounded))`.
4. For each leftover cent (1 by 1), find the index with the largest positive remainder; on ties use canonical member order. Add 0.01 to that rounded share, subtract 0.01 from that remainder.
5. Return the final rounded shares.

The result is deterministic for identical input (idempotence).

#### Split Calculation (`utils/split.ts`)

`calculateShares(expenseInput)` dispatches on `splitType`:

- **Equal**: `rawShare = amount / n` for each of `n` members in `splitBetween`. Then `allocateLeftover`.
- **Custom**: use entered amounts directly (already rounded). Validate sum equals `amount` exactly (within 0.01 tolerance). No leftover allocation needed.
- **Percentage**: `rawShare = amount * pct / 100`. Validate percentages sum to 100. Then `allocateLeftover`.
- **Shares**: `rawShare = amount * weight / totalWeight`. Validate weights > 0. Then `allocateLeftover`.

Each returns `Record<MemberId, number>` over exactly `splitBetween`.

#### Balance Computation (`utils/balance.ts`)

`computeBalances(expenses): NetBalance[]`:

1. For each member: `paid = sum(amount where paidBy == member)`.
2. `owed = sum(shares[member] where member in splitBetween)`.
3. `net = paid - owed`, rounded to 2 decimals.

Invariant: `sum(nets) == 0` (conservation), modulo a tiny floating tolerance reconciled by rounding.

#### Debt Simplification (`utils/settlement.ts`)

`simplifyDebts(balances): Settlement[]` (greedy largest match):

1. Build two lists: creditors (net > 0) and debtors (net < 0), sorted by absolute value descending; on ties, by canonical member order.
2. While a creditor and debtor remain: take the largest creditor `C` and largest debtor `D`. `payment = min(|C.net|, |D.net|)`. Emit `Settlement { from: D, to: C, amount: roundHalfUp(payment, 2) }`. Reduce both by `payment`; drop any that reach zero (within tolerance).
3. Sort settlements deterministically.

Invariant: settlements zero out all balances; count <= members - 1.

#### Chat Parser (`utils/parser.ts`)

`parseChat(text): ChatParseResult`:

- Split into lines; trim; skip blanks.
- For each line, attempt to extract amount, payer, description using a tolerant grammar (e.g., leading number = amount; a `@Member` token or known member name = paidBy; rest = description).
- High-confidence parse (amount found and paidBy found among member names) -> `candidates`.
- Ambiguous (amount missing, or payer not recognized, or multiple amounts) -> `flagged` with a reason.
- The parser is pure: returns data, does not mutate state.

#### Serializer & Storage (`utils/serializer.ts`, `utils/storage.ts`)

`serializeExpense` / `deserializeExpense`: map between `Expense` and a JSON-safe object preserving all fields, member ids, split type, shares, and split input.

`storage`:

- `loadExpenses()`: read key `get:expenses`; if JSON parse fails, log warning and return `[]` (reset only that field).
- `saveExpenses(expenses)`: write JSON.
- `loadRole()` / `saveRole(role)`: same pattern with default `'user'`.
- Each field is independent: a corrupt role does not wipe expenses, and vice versa.

#### Validation (`utils/validation.ts`)

`validateExpense(input): Record<field, string>` returns field-keyed error messages:

- `amount > 0` else error.
- `paidBy` must be a member id else error.
- `splitBetween` non-empty else error.
- `Percentage`: percentages sum to 100 else error.
- `Shares`: all weights > 0 else error.
- `Custom`: amounts sum to amount (within 0.01) else error.

## Data Models

### Types (`src/types/index.ts`)

```ts
export type MemberId = "Ankit" | "Bhargav" | "Devansh" | "Dhvanil" | "Kashyap" | "Ish" | "Sagar";
export type Member = { id: MemberId; name: string };

export type SplitType = "Equal" | "Custom" | "Percentage" | "Shares";

// Per-member input depending on split type.
// - Equal: no per-member input needed (shares derived).
// - Custom: exact amount per member (must sum to amount).
// - Percentage: percentage per member (must sum to 100).
// - Shares: positive weight per member.
export type SplitInput =
  | { type: "Equal" }
  | { type: "Custom"; amounts: Record<MemberId, number> }
  | { type: "Percentage"; percentages: Record<MemberId, number> }
  | { type: "Shares"; weights: Record<MemberId, number> };

export type Expense = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // 2 decimals, > 0
  paidBy: MemberId;
  splitBetween: MemberId[];
  splitType: SplitType;
  // Final per-member owed amounts after splitting + rounding + leftover allocation.
  shares: Record<MemberId, number>;
  // Original input used to derive shares (for editing).
  splitInput: SplitInput;
};

export type NetBalance = {
  memberId: MemberId;
  paid: number; // total paid by member
  owed: number; // total owed by member
  net: number; // paid - owed (positive = creditor)
};

export type Settlement = {
  from: MemberId; // payer (debtor)
  to: MemberId; // payee (creditor)
  amount: number; // 2 decimals
};

export type Role = "admin" | "user";

export type ChatParseResult = {
  candidates: ParsedExpense[]; // high-confidence parses
  flagged: FlaggedLine[]; // ambiguous lines for manual review
};

export type ParsedExpense = {
  amount: number;
  paidBy: MemberId | null;
  description: string;
  raw: string;
};

export type FlaggedLine = {
  raw: string;
  reason: string;
};
```

### Fixed Members (`src/constants/members.ts`)

```ts
export const MEMBERS: Member[] = [
  { id: "Ankit", name: "Ankit" },
  { id: "Bhargav", name: "Bhargav" },
  { id: "Devansh", name: "Devansh" },
  { id: "Dhvanil", name: "Dhvanil" },
  { id: "Kashyap", name: "Kashyap" },
  { id: "Ish", name: "Ish" },
  { id: "Sagar", name: "Sagar" },
];
export const MEMBER_IDS: MemberId[] = MEMBERS.map((m) => m.id);
```

Canonical order is the array order above; all tie-breaking and display uses this order.

## State Management Design

`ExpenseContext` exposes `{ expenses, role, dispatch }`. The reducer handles actions:

- `ADD_EXPENSE`, `EDIT_EXPENSE`, `DELETE_EXPENSE` — mutate `expenses`; shares are (re)computed by utilities at dispatch time and stored on the expense.
- `SET_ROLE` — toggle role.
- `LOAD_STATE` — hydrate from storage on init.

Derived values (`balances`, `settlements`, `totals`) are computed in the `useExpenses` hook via `useMemo` over `expenses` — never stored in state. This keeps a single source of truth and guarantees derived correctness follows directly from the tested utilities.

A `useEffect` persists `expenses` and `role` to `localStorage` whenever they change.

## Routing & Role Guard Design

```
/            -> redirect to /dashboard
/dashboard   -> Dashboard (all roles, read-only)
/ledger      -> RoleGuard -> LedgerEntry (admin only)
*            -> redirect to /dashboard
```

`RoleGuard` checks `role`; if `role === 'user'`, it renders `<Navigate to="/dashboard" />`. Otherwise renders the protected page (wrapped in `<Outlet/>` or the element directly). The nav bar hides the Ledger link when role is `user`.

### Page Designs

#### Dashboard (`pages/Dashboard.tsx`)

- `DashboardHeader`: displays the app title "Payment & Balance Dashboard", a subtitle "Detailed ledger showing who paid how much till now and real-time net balances", a "Synced" status badge, and a "+ Record Expense" button (admin only; hidden for User role).
- `StatCards`: a row of four summary stat cards — `TotalPaidCard` ("Total Paid Till Now", sum of all expense amounts), `TopPayerCard` (member with highest total paid, showing amount and % of total), `ActivePayersCard` (count of members who have paid at least one expense, shown as X/7 with subtitle), and `EqualShareCard` (total amount divided by 7, shown as fair share per member). The Total Paid card shows an "All settled in group" status text when all member net balances are zero.
- Section heading "Who Paid How Much Till Now" with a "7 Members" badge and a view toggle (`Cards View` | `Paid vs Share Comparison`).
- `MemberCardGrid`: a responsive grid of `MemberCard` components; toggles between Cards View (default) and Paid vs Share Comparison view.
- `MemberCard`: shows an initials avatar (2-letter, colored by member), member name, payment count and % of total, total paid so far with ₹ prefix, a horizontal colored progress bar representing proportion of total paid, fair share amount, and a status badge — green "Gets back {amount}" for creditors (net > 0) or amber "Owes {amount}" for debtors (net < 0).
- `SettlementList`: table of `from -> to @ amount`, displayed below the member grid.
- Reads derived data from `useExpenses`; renders identically for admin and user (user just lacks the Ledger nav link and the Record Expense CTA).

#### Ledger Entry (`pages/LedgerEntry.tsx`, admin only)

- `ExpenseForm`: fields for date, description, amount, paidBy, splitType, splitBetween, and a `SplitEditor` that adapts inputs to splitType. Shows field-level validation errors adjacently.
- `ExpenseTable`: existing expenses with edit/delete actions.
- `ChatPasteBox`: textarea to paste lines; on parse, shows `candidates` for bulk confirm and `flagged` lines for manual review/fix.

## Components and Interfaces

| Component         | Interface                                               | Responsibility                                                              |
| ----------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `Layout`          | `() => JSX` (uses `useExpenses`)                        | App shell: `NavBar` + `RoleSwitcher` + routed `<Outlet/>`                   |
| `NavBar`          | `() => JSX` (uses `useRole`)                            | Links to Dashboard (always) and Ledger (admin only)                         |
| `RoleSwitcher`    | `() => JSX` (dispatch `SET_ROLE`)                       | Toggle admin/user                                                           |
| `RoleGuard`       | `{ children: ReactNode }`                               | Protect `/ledger`; redirect `user` to `/dashboard`                          |
| `DashboardHeader` | `{ role }`                                              | App title, synced badge, record expense CTA (admin only)                    |
| `StatCards`       | `{ expenses, balances }`                                | Four summary stat cards (Total Paid, Top Payer, Active Payers, Equal Share) |
| `MemberCardGrid`  | `{ balances, expenses, view: 'cards' \| 'comparison' }` | Toggle between Cards View and Paid vs Share Comparison                      |
| `MemberCard`      | `{ balance, totalPaid, totalExpenses, fairShare }`      | Individual member card with avatar, progress bar, status badge              |
| `BalanceList`     | `{ balances: NetBalance[] }`                            | Per-member balances, creditor/debtor color                                  |
| `SettlementList`  | `{ settlements: Settlement[] }`                         | Settlement table                                                            |
| `BalanceChart`    | `{ balances: NetBalance[] }`                            | Visual breakdown of net balances                                            |
| `ExpenseForm`     | `{ expense?: Expense; onSubmit: (e) => void }`          | Create/edit with field-level validation                                     |
| `SplitEditor`     | `{ splitType; splitBetween; amount; onChange }`         | Split-type-aware inputs (equal/custom/percentage/shares)                    |
| `ExpenseTable`    | `{ expenses: Expense[]; onEdit; onDelete }`             | Existing expenses + edit/delete                                             |
| `ChatPasteBox`    | `{ onConfirm: (expenses) => void }`                     | Paste + parse + flagged-line review                                         |

### Context & Hook Interfaces

- `ExpenseContext` value: `{ expenses: Expense[]; role: Role; dispatch: Dispatch<Action> }`.
- `useExpenses()` returns `{ expenses, role, dispatch, balances: NetBalance[], settlements: Settlement[], totals }` where `balances`/`settlements`/`totals` are `useMemo`-derived.
- `useRole()` returns `{ role, setRole }`.

### Utility Function Interfaces

- `roundHalfUp(value: number, decimals?: number): number`
- `allocateLeftover(amount: number, rawShares: number[]): number[]`
- `calculateShares(amount: number, splitBetween: MemberId[], input: SplitInput): Record<MemberId, number>`
- `resolveShares(expense: Expense): Record<MemberId, number>`
- `computeBalances(expenses: Expense[]): NetBalance[]`
- `simplifyDebts(balances: NetBalance[]): Settlement[]`
- `parseChat(text: string): ChatParseResult`
- `serializeExpense(e: Expense): unknown` / `deserializeExpense(o: unknown): Expense`
- `validateExpense(input: ExpenseDraft): Partial<Record<keyof ExpenseDraft, string>>`

## Error Handling

- **Validation errors**: field-keyed messages rendered adjacent to the relevant form field (unconditional invariant). Submit is blocked while errors exist.
- **Split input rejections**: `Percentage` (sum != 100), `Shares` (weight <= 0), `Custom` (sum != amount) are rejected at validation time with a descriptive error; the expense is not created.
- **Persistence corruption**: if a specific `localStorage` field fails to parse, only that field resets to its default and a warning is logged; valid sibling data is preserved (Req 17.7).
- **Chat parser ambiguity**: unparseable lines are flagged with a reason and presented for manual confirmation rather than auto-created (Req 16.4–16.5).
- **Routing**: unknown routes redirect to `/dashboard`; a `user` navigating to `/ledger` is redirected to `/dashboard` rather than shown an error.
- **Floating-point reconciliation**: balance zero-sum and split sum invariants are checked within a 0.01 rounding tolerance to absorb binary float representation errors; final displayed values are rounded to 2 decimals.

## Correctness Properties

### Property 1: Split sum invariant

For every accepted expense, the sum of per-member shares equals the expense amount exactly (2 decimals), for all split types (Equal, Custom, Percentage, Shares).

- Scope: `split.ts`.
- Test type: property (random amounts, random splitBetween subsets, random valid percentage/weight/custom distributions).
  **Validates: Requirements 3**
  **Validates: Requirements 4**
  **Validates: Requirements 5**
  **Validates: Requirements 6**
  **Validates: Requirements 7**
  **Validates: Requirements 8**

### Property 2: Equal-share invariant

For Equal splits after leftover allocation, all members in splitBetween have share amounts that differ by at most 0.01 (leftover cents); the one-member case assigns the full amount.

- Scope: `split.ts`.
- Test type: property + edge case (one member = full amount).
  **Validates: Requirements 3**

### Property 3: Raw-share formula correctness

For Percentage, `rawShare = amount * pct / 100`; for Shares, `rawShare = amount * weight / totalWeight` (before rounding).

- Scope: `split.ts`.
- Test type: property.
  **Validates: Requirements 5**
  **Validates: Requirements 6**

### Property 4: Rounding exact-sum, idempotence, determinism

After `allocateLeftover`, shares sum to `amount` exactly; calling twice yields identical output; identical input always yields identical output; tie-breaking follows canonical member order.

- Scope: `rounding.ts`.
- Test type: property + edge case (ties).
  **Validates: Requirements 7**

### Property 5: Owed resolution keys/zero/sum

`resolveShares` returns keys exactly equal to `splitBetween`; non-members get zero; shares sum to amount.

- Scope: `split.ts`.
- Test type: property.
  **Validates: Requirements 8**

### Property 6: Balance zero-sum conservation

`sum(computeBalances(expenses).net) == 0` for all expense sets (within rounding tolerance).

- Scope: `balance.ts`.
- Test type: property.
  **Validates: Requirements 9**

### Property 7: Settlement zero-out and upper bound

After applying `simplifyDebts` settlements to balances, every member net is zero; settlement count <= members - 1; payer is a debtor and payee is a creditor; only non-zero members appear.

- Scope: `settlement.ts`.
- Test type: property.
  **Validates: Requirements 10**

### Property 8: Settlement determinism

Identical balances yield identical settlement lists (tie-breaking by canonical order).

- Scope: `settlement.ts`.
- Test type: property.
  **Validates: Requirements 10**

### Property 9: Serialization round-trip

For every expense, `deserializeExpense(serializeExpense(e))` equals `e` across all split types and fields.

- Scope: `serializer.ts`.
- Test type: property (random expenses).
  **Validates: Requirements 20**

### Property 10: Persistence round-trip

Saving expenses to `localStorage` and loading yields an equivalent ledger.

- Scope: `storage.ts`.
- Test type: property (mocked localStorage).
  **Validates: Requirements 17**

### Property 11: Corrupt-field fallback isolation

If the role key is corrupt, expenses are preserved (and vice versa); only the corrupt field resets to default.

- Scope: `storage.ts`.
- Test type: edge case.
  **Validates: Requirements 17**

### Property 12: Chat parser purity and correctness

`parseChat` returns data only (no state mutation); parseable lines yield correct candidates; ambiguous lines are flagged, not auto-created.

- Scope: `parser.ts`.
- Test type: property (purity) + example/edge case (flagged lines).
  **Validates: Requirements 16**

### Property 13: Validation rejection rules and adjacency

Each invalid condition produces a field-keyed error; valid input produces no errors; errors are adjacent to fields (integration invariant).

- Scope: `validation.ts`, `ExpenseForm`.
- Test type: example/edge case (rules) + integration (adjacency invariant).
  **Validates: Requirements 15**

### Property 14: Route guard behavior

With role `user`, navigating to `/ledger` redirects to `/dashboard`; with role `admin`, `/ledger` renders.

- Scope: `RoleGuard`, router.
- Test type: integration (representative examples).
  **Validates: Requirements 12**

### Property 15: Role toggle and persistence

Toggling role updates state and persists; load hydrates the persisted role.

- Scope: `context`, `storage`.
- Test type: example/integration.
  **Validates: Requirements 11**

### Property 16: Dashboard and ledger integration

Dashboard renders values equal to derived balances/settlements; add/edit/delete updates derived values.

- Scope: `pages`, `context`.
- Test type: integration (representative examples).
  **Validates: Requirements 13**
  **Validates: Requirements 14**

### Property 17: Fixed membership

Members list is exactly the seven fixed members in canonical order; references resolve only to the fixed set.

- Scope: `constants/members.ts`.
- Test type: example + small property.
  **Validates: Requirements 1**

### Not directly testable as a property

- Req 18 (accessibility/responsiveness): integration tests + manual a11y audit.
- Req 19 (test suite existence): verified by test artifacts, not a runtime property.

## Testing Strategy

- **Framework**: Vitest (Vite-native) with property-based testing via `fast-check` for the pure utilities.
- **Pure utilities** (`split`, `rounding`, `balance`, `settlement`, `parser`, `serializer`): property-based tests (Properties 1–12) plus targeted edge-case tests for boundaries (one member, ties, zero balances, 100%-sum, weight>0, custom-sum mismatch).
- **Storage/validation**: edge-case tests for corrupt-field fallback and each rejection rule.
- **Reducer/context**: integration tests for add/edit/delete/recompute and role toggle.
- **Routing**: integration tests with React Router for the role guard redirect and admin access.
- **Pages**: integration/render tests asserting dashboard values match derived state and CRUD flows recompute.
- **Accessibility**: a lightweight a11y assertion pass (focus visibility, labeled controls) plus manual review; not a property test.

### Recommended test command

```
npm install
npm test -- --run     # single run (not watch)
npm run dev            # start dev server (manual)
```

## Notes on Assumptions

The Assumptions and Flagged Ambiguities from the requirements document carry forward as design decisions:

- Largest-Remainder Method is the leftover allocator (could be swapped if another method is preferred).
- Percentage and Custom totals are strictly enforced (rejected, not auto-corrected).
- Settlements are always derived, never stored as transactions.
- Role persistence is convenience, not a security boundary.
- Corrupt persisted fields are reset individually; valid sibling data is preserved.
- Currency is displayed as ₹ (Indian Rupee) prefix throughout the UI.
