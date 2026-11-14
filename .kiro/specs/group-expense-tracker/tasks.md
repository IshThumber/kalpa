# Implementation Plan: Group Expense Tracker

## Overview

This plan implements a single-page React + TypeScript group expense tracker for a fixed seven-member group. It covers project setup, types/constants, pure calculation utilities (splitting, rounding, balances, settlements), property-based unit tests, state management (Context + reducer), routing with a role guard, the Dashboard and Ledger Entry pages, persistence, accessibility, and final verification. Tasks are ordered so each phase's dependencies are satisfied by earlier phases.

## Tasks

### Phase 1: Project Setup and Tooling

- [x] 1.1 Install runtime dependencies: `react-router-dom` for routing and `fast-check` for property-based testing; add `vitest` + `@testing-library/react` + `jsdom` as dev dependencies.
- [ ] 1.2 Configure Vitest with jsdom environment in `vite.config.ts` (or `vitest.config.ts`) and add a `test` script (`vitest --run`).
- [ ] 1.3 Create the folder skeleton: `src/{types,constants,utils,context,hooks,components,components/ui,pages,__tests__}`.
- [ ] 1.4 Set up the root `App.tsx` with React Router (`BrowserRouter`, routes, redirects) and a `Layout` outlet.

### Phase 2: Types and Constants

- [ ] 2.1 Define TypeScript types in `src/types/index.ts`: `MemberId`, `Member`, `SplitType`, `SplitInput` (discriminated union), `Expense`, `NetBalance`, `Settlement`, `Role`, `ChatParseResult`, `ParsedExpense`, `FlaggedLine`, and an `ExpenseDraft`/`Action` type.
- [ ] 2.2 Create `src/constants/members.ts` exporting the fixed `MEMBERS` array (Ankit, Bhargav, Devansh, Dhvanil, Kashyap, Ish, Sagar) in canonical order and `MEMBER_IDS`.

### Phase 3: Rounding and Split Utilities

- [ ] 3.1 Implement `roundHalfUp(value, decimals)` in `src/utils/rounding.ts` using a decimal-safe approach (e.g., scale, round, unscale) to avoid binary float drift.
- [ ] 3.2 Implement `allocateLeftover(amount, rawShares)` (largest-remainder method) returning shares that sum exactly to `amount`, with deterministic canonical-order tie-breaking.
- [ ] 3.3 Implement `calculateShares(amount, splitBetween, splitInput)` in `src/utils/split.ts` dispatching across `Equal`, `Custom`, `Percentage`, `Shares`; returns `Record<MemberId, number>` over exactly `splitBetween`.
- [ ] 3.4 Implement `resolveShares(expense)` returning the full per-member map (zero for non-`splitBetween` members) summing to `amount`.

### Phase 4: Balance and Settlement Utilities

- [ ] 4.1 Implement `computeBalances(expenses)` in `src/utils/balance.ts` returning `NetBalance[]` (paid, owed, net per member) rounded to 2 decimals.
- [ ] 4.2 Implement `simplifyDebts(balances)` in `src/utils/settlement.ts` using greedy largest-creditor/largest-debtor matching with canonical-order tie-breaking; returns `Settlement[]` with payer=debtor, payee=creditor.

### Phase 5: Parser, Serializer, Storage, Validation Utilities

- [ ] 5.1 Implement `parseChat(text)` in `src/utils/parser.ts` as a pure function returning `{ candidates, flagged }`; high-confidence lines yield candidates, ambiguous lines are flagged with a reason; no state mutation.
- [ ] 5.2 Implement `serializeExpense`/`deserializeExpense` in `src/utils/serializer.ts` preserving all `Expense` fields (id, date, description, amount, paidBy, splitBetween, splitType, shares, splitInput).
- [ ] 5.3 Implement `src/utils/storage.ts` with `loadExpenses`/`saveExpenses` (key `get:expenses`) and `loadRole`/`saveRole` (key `get:role`); each field resets to default independently on parse failure while preserving valid sibling data and logging a warning.
- [ ] 5.4 Implement `validateExpense(draft)` in `src/utils/validation.ts` returning field-keyed error messages for: amount > 0, paidBy required, splitBetween non-empty, percentage sum == 100, weights > 0, custom sum == amount.

### Phase 6: Utility Unit Tests (Property-Based)

- [ ] 6.1 Write property-based tests in `src/__tests__/rounding.test.ts`: exact-sum invariant after `allocateLeftover`, idempotence, determinism, and tie-breaking edge cases.
- [ ] 6.2 Write property-based tests in `src/__tests__/split.test.ts`: split-sum invariant across all four split types, equal-share invariant (max-min <= 0.01), one-member edge case, raw-share formula correctness, and rejection cases (percentage != 100, weight <= 0, custom sum != amount).
- [ ] 6.3 Write property-based tests in `src/__tests__/balance.test.ts`: zero-sum conservation invariant, paid/owed definition correctness, and exclusion cases (payer not in splitBetween).
- [ ] 6.4 Write property-based tests in `src/__tests__/settlement.test.ts`: settlements zero out all balances, settlement count <= members - 1, payer is debtor and payee is creditor, determinism with tie-breaking.
- [ ] 6.5 Write tests in `src/__tests__/serializer.test.ts`: round-trip property (`deserialize(serialize(e))` equals `e`) across all split types and fields.
- [ ] 6.6 Write tests in `src/__tests__/parser.test.ts`: parser purity (no side effects), correct candidates for parseable lines, flagged lines for ambiguous input.
- [ ] 6.7 Write tests in `src/__tests__/storage.test.ts`: persistence round-trip and corrupt-field fallback isolation (corrupt role preserves expenses and vice versa).
- [ ] 6.8 Write tests in `src/__tests__/validation.test.ts`: each rejection rule produces a field-keyed error; valid input produces no errors.
- [ ] 6.9 Run the full test suite (`npm test -- --run`) and confirm all utility tests pass.

### Phase 7: State Management

- [ ] 7.1 Implement `src/context/expenseReducer.ts` handling `ADD_EXPENSE`, `EDIT_EXPENSE`, `DELETE_EXPENSE`, `SET_ROLE`, `LOAD_STATE`; recompute shares via `calculateShares` at add/edit time and store on the expense.
- [ ] 7.2 Implement `src/context/ExpenseContext.tsx` providing `{ expenses, role, dispatch }` and hydrating from `storage` on init; persist `expenses` and `role` to `localStorage` on every change via `useEffect`.
- [ ] 7.3 Implement `src/hooks/useExpenses.ts` returning `expenses`, `role`, `dispatch`, and `useMemo`-derived `balances`, `settlements`, and `totals`.
- [ ] 7.4 Implement `src/hooks/useRole.ts` returning `{ role, setRole }` that dispatches `SET_ROLE`.

### Phase 8: Routing and Role Guard

- [ ] 8.1 Implement `src/components/RoleGuard.tsx` that redirects `user` to `/dashboard` via `<Navigate>` and renders children for `admin`.
- [ ] 8.2 Wire routes in `App.tsx`: `/` -> redirect to `/dashboard`, `/dashboard` -> Dashboard, `/ledger` -> `RoleGuard` wrapping LedgerEntry, `*` -> redirect to `/dashboard`.

### Phase 9: Layout and Shared Components

- [ ] 9.1 Implement small UI primitives in `src/components/ui/` (Button, Card, Field/Input, Table) with accessible labels and visible focus styles.
- [ ] 9.2 Implement `src/components/Layout.tsx` (app shell with `NavBar` + `RoleSwitcher` + routed `<Outlet/>`).
- [ ] 9.3 Implement `src/components/NavBar.tsx` showing Dashboard always and Ledger only when role is `admin`.
- [ ] 9.4 Implement `src/components/RoleSwitcher.tsx` toggling between admin/user and dispatching `SET_ROLE`.

### Phase 10: Dashboard Components

- [ ] 10.1 Implement `src/components/DashboardHeader.tsx` displaying the title "Payment & Balance Dashboard", subtitle, a "Synced" status badge, and a "+ Record Expense" button that is visible only when role is `admin` and navigates to `/ledger` (Req 21).
- [ ] 10.2 Implement `src/components/StatCards.tsx` rendering four stat cards: "Total Paid Till Now" (sum of all expenses, with "All settled in group" badge when all nets are zero), "Top Payer" (member with highest paid + ₹ amount + % of total), "Active Payers" (X/7 count of members with at least one payment), and "Equal Share / Member" (total ÷ 7) (Req 13.1, 13.5).
- [ ] 10.3 Implement `src/components/MemberCard.tsx` showing: 2-letter initials avatar (member-colored), name, payment count and % of total, total paid with ₹ prefix, a colored horizontal progress bar (proportion of total paid), fair share label, and a status badge — green "Gets back {amount}" for creditors or amber "Owes {amount}" for debtors (Req 13.3).
- [ ] 10.4 Implement `src/components/MemberCardGrid.tsx` rendering all 7 member cards in a responsive grid with a "Who Paid How Much Till Now" heading, "7 Members" badge, and a view toggle between "Cards View" (default) and "Paid vs Share Comparison" (bar chart comparing paid vs fair share per member) (Req 13.2, 13.4).
- [ ] 10.5 Implement `src/components/SettlementList.tsx` showing the `from → to @ ₹amount` settlement table (Req 13.6).
- [ ] 10.6 Implement `src/pages/Dashboard.tsx` composing `DashboardHeader`, `StatCards`, `MemberCardGrid`, and `SettlementList` from `useExpenses`-derived data; render identically for admin and user (Req 13.7, 13.8).

### Phase 11: Ledger Entry Components

- [ ] 11.1 Implement `src/components/SplitEditor.tsx` adapting inputs to the selected `splitType` (equal toggle for splitBetween, custom amounts, percentages, shares) and updating `splitBetween`.
- [ ] 11.2 Implement `src/components/ExpenseForm.tsx` with fields for date, description, amount, paidBy, splitType, splitBetween; runs `validateExpense` and renders field-level errors adjacently; supports create and edit.
- [ ] 11.3 Implement `src/components/ExpenseTable.tsx` listing existing expenses with edit and delete actions that dispatch reducer actions.
- [ ] 11.4 Implement `src/components/ChatPasteBox.tsx` with a textarea; on parse shows `candidates` for bulk confirm and `flagged` lines for manual review/fix before committing.
- [ ] 11.5 Implement `src/pages/LedgerEntry.tsx` composing `ExpenseForm`, `ExpenseTable`, and `ChatPasteBox` (admin only, route-guarded).

### Phase 12: Integration, Accessibility, and Polish

- [ ] 12.1 Write integration tests for the reducer/context: add/edit/delete recompute balances and settlements; role toggle persists.
- [ ] 12.2 Write integration tests for routing: `user` navigating to `/ledger` redirects to `/dashboard`; `admin` can access `/ledger`.
- [ ] 12.3 Write integration tests for the Dashboard rendering values equal to derived balances/settlements and the Ledger add/edit/delete flow recomputing.
- [ ] 12.4 Verify responsive layout across mobile, tablet, and desktop viewport widths.
- [ ] 12.5 Verify keyboard operability, visible focus indicators, labeled form controls, and semantic HTML for pages and navigation.
- [ ] 12.6 Add a README section with setup/run instructions (`npm install`, `npm run dev`, `npm test -- --run`, `npm run build`) and notes on assumptions.

### Phase 13: Final Verification

- [ ] 13.1 Run `npm run build` and confirm the production build succeeds with no TypeScript errors.
- [ ] 13.2 Run `npm test -- --run` and confirm the full suite passes.
- [ ] 13.3 Verify `localStorage` persistence survives a page refresh for both expenses and role.
- [ ] 13.4 Confirm corrupt `localStorage` data resets only the corrupted field while preserving valid data.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 1, "name": "Setup & Tooling", "tasks": ["1.1", "1.2", "1.3", "1.4"], "dependsOn": [] },
    { "id": 2, "name": "Types & Constants", "tasks": ["2.1", "2.2"], "dependsOn": [1] },
    { "id": 3, "name": "Rounding & Split Utilities", "tasks": ["3.1", "3.2", "3.3", "3.4"], "dependsOn": [2] },
    { "id": 4, "name": "Balance & Settlement Utilities", "tasks": ["4.1", "4.2"], "dependsOn": [2] },
    {
      "id": 5,
      "name": "Parser/Serializer/Storage/Validation Utilities",
      "tasks": ["5.1", "5.2", "5.3", "5.4"],
      "dependsOn": [2]
    },
    {
      "id": 6,
      "name": "Utility Property-Based Tests",
      "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9"],
      "dependsOn": [3, 4, 5]
    },
    { "id": 7, "name": "State Management", "tasks": ["7.1", "7.2", "7.3", "7.4"], "dependsOn": [3, 4, 5, 6] },
    { "id": 8, "name": "Routing & Role Guard", "tasks": ["8.1", "8.2"], "dependsOn": [7] },
    { "id": 9, "name": "Layout & Shared Components", "tasks": ["9.1", "9.2", "9.3", "9.4"], "dependsOn": [7, 8] },
    {
      "id": 10,
      "name": "Dashboard Components",
      "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6"],
      "dependsOn": [9]
    },
    {
      "id": 11,
      "name": "Ledger Entry Components",
      "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5"],
      "dependsOn": [8, 9]
    },
    {
      "id": 12,
      "name": "Integration, Accessibility & Polish",
      "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5", "12.6"],
      "dependsOn": [10, 11]
    },
    { "id": 13, "name": "Final Verification", "tasks": ["13.1", "13.2", "13.3", "13.4"], "dependsOn": [12] }
  ]
}
```

Key dependencies:

- Phases 3–5 (utilities) depend on Phase 2 (types/constants) and are independent of each other.
- Phase 6 (tests) depends on the utilities it tests (Phases 3–5) and should ideally be written alongside each utility (TDD-friendly).
- Phase 7 (state management) depends on the utilities (Phases 3–5) for share/balance/settlement computation.
- Phase 8 (routing) and Phase 9 (layout) depend on Phase 7 (state/hooks) for role access.
- Phases 10–11 (pages/components) depend on Phases 7–9.
- Phase 12 (integration/a11y) depends on Phases 10–11.
- Phase 13 (final verification) depends on everything.

## Notes

- **TDD approach**: Phase 6 tests are placed after the utilities but can be written test-first alongside Phases 3–5. The property-based tests (6.1–6.6) target the pure functions, which have no React dependencies and run fast.
- **Assumptions carried over** from the requirements/design: Largest-Remainder Method for leftover cents; strict enforcement of percentage/custom totals (rejected, not auto-corrected); settlements always derived, never stored; role persistence is convenience, not a security boundary; corrupt persisted fields reset individually.
- **No model.smt2 / formal verification**: This is a requirements-first feature spec; correctness is validated via property-based and integration tests rather than SMT verification.
- **Splitting logic lives in pure utilities** so it is fully testable without rendering React components; pages are thin and delegate to derived state.
