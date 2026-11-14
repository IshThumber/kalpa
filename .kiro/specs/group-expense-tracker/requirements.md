# Requirements Document

## Introduction

This document specifies a single-page React web application called the **Group Expense Tracker**, a Splitwise-style tool for a fixed group of seven members. The application records shared expenses, splits each expense among a subset of members using one of four split types (Equal, Custom, Percentage, Shares), computes per-member net balances, and simplifies debts into a minimal set of settlement payments.

The application has no login or authentication. A simple in-app role switcher toggles between two roles:

- **Admin** — full access: the Dashboard (read-only overview) and the Ledger Entry page (create, edit, delete expenses).
- **User** — limited access: the Dashboard only (read-only). The Ledger Entry page is hidden and route-guarded.

State is held in memory via React Context + `useReducer` (or a justified store) and persisted to `localStorage` so data survives a page refresh. All balance, split, rounding, and settlement logic is implemented as pure, unit-tested utility functions. Routing uses React Router with a role-based route guard.

## Glossary

- **Application**: The Group Expense Tracker single-page web application.
- **Member**: One of seven fixed group participants — Ankit, Bhargav, Devansh, Dhvanil, Kashyap, Ish, Sagar.
- **Expense**: A recorded transaction with fields `id`, `date`, `description`, `amount`, `paidBy`, `splitType`, `splitBetween`, and per-member `shares` (owed amounts).
- **SplitType**: One of `Equal`, `Custom`, `Percentage`, or `Shares`.
- **splitBetween**: The subset of Members who share an Expense (exclusions allowed; a Member may pay but be excluded from the split).
- **Share Amount**: The per-Member owed amount for a single Expense, expressed as a non-negative number rounded to 2 decimals.
- **Raw Share**: The exact (unrounded) per-Member share computed before leftover-cent allocation.
- **Net Balance**: For a Member, total amount paid by that Member minus total amount owed by that Member across all Expenses. Positive means the Member is owed money; negative means the Member owes money.
- **Creditor**: A Member whose Net Balance is greater than zero.
- **Debtor**: A Member whose Net Balance is less than zero.
- **Settlement**: A single payment from one Member (payer) to another Member (payee) for a specific amount, produced by debt simplification.
- **Largest-Remainder Method**: A deterministic procedure that distributes leftover cents to the Members with the largest Raw Shares so that the rounded Share Amounts sum exactly to the Expense amount.
- **Debt Simplification**: An algorithm that repeatedly matches the largest Creditor with the largest Debtor to produce a minimal set of Settlements that zero out all Net Balances.
- **Chat Parser**: The utility that converts chat-style text lines into Expense candidates.
- **Admin**: The role that may access both the Dashboard and the Ledger Entry page.
- **User**: The role that may access only the Dashboard (read-only).
- **Role Switcher**: The in-app control that changes the active role without authentication.
- **Ledger Entry Page**: The admin-only page for creating, editing, and deleting Expenses.
- **Dashboard**: The read-only page showing balances, settlements, and summaries.

## Assumptions and Flagged Ambiguities

These items are assumptions made to produce a complete initial specification. They are flagged so the user can confirm or correct them during review.

1. **Currency**: Currency symbol is ₹ (Indian Rupee). All monetary amounts are displayed with the ₹ prefix.
2. **Leftover cent allocation method**: The request lists largest-remainder, rotating, or sorted order as options. This specification standardizes on the **Largest-Remainder Method** for deterministic allocation. If a different method is preferred, Requirement 7 should be revised.
3. **Date handling**: `date` is a calendar date (YYYY-MM-DD). Time-of-day and time zones are out of scope; sorting uses date only.
4. **Percentage total enforcement**: Percentages must sum to exactly 100. A sum of 99 or 101 is rejected (not silently normalized).
5. **Shares definition**: For the `Shares` split type, each selected Member has a positive integer (or positive decimal) weight; owed amounts are proportional to weights. Weights are required to be greater than zero.
6. **Custom split total**: For the `Custom` split type, the sum of entered per-Member amounts must equal the Expense amount exactly (within 2 decimals). A mismatch is rejected rather than auto-adjusted.
7. **Exclusions**: A Member in `paidBy` may be excluded from `splitBetween`. The payer's owed amount is computed only from Expenses where the payer is in `splitBetween`.
8. **Settlement tie-breaking**: When two Members have equal absolute balances during debt simplification, the tie is broken by stable sorted Member order (the fixed member list order) to keep results deterministic.
9. **Edit/delete persistence**: Editing or deleting an Expense recomputes all derived balances and settlements; no separate "settlement transaction" concept is stored — settlements are always derived from current Expenses.
10. **Chat parsing ambiguity**: Lines that cannot be parsed with high confidence are flagged for manual confirmation rather than auto-created.
11. **Role persistence**: The active role is persisted to `localStorage` so a refresh preserves the selected role, but it is not a security boundary (there is no authentication).
12. **Empty state**: With zero Expenses, all balances are zero and the settlement list is empty.

## Requirements

### Requirement 1: Fixed Group Membership

**User Story:** As a group member, I want the group to always contain the same seven members, so that expense splitting and balances are consistent.

#### Acceptance Criteria

1. THE Application SHALL expose exactly seven fixed Members: Ankit, Bhargav, Devansh, Dhvanil, Kashyap, Ish, Sagar.
2. THE Application SHALL prevent adding, renaming, or removing a Member.
3. WHERE an Expense references a Member, THE Application SHALL identify that Member by a stable identifier derived from the fixed Member list.
4. THE Application SHALL display the fixed Member list in a single canonical order consistently across all pages and utilities.

### Requirement 2: Expense Data Model

**User Story:** As an admin, I want each expense to carry a consistent set of fields, so that splits and balances can be computed reliably.

#### Acceptance Criteria

1. THE Application SHALL represent each Expense with the fields `id`, `date`, `description`, `amount`, `paidBy`, `splitType`, `splitBetween`, and per-Member `shares`.
2. THE Application SHALL generate a unique `id` for each Expense at creation time.
3. THE Application SHALL store `amount` as a non-negative number rounded to 2 decimals.
4. THE Application SHALL restrict `paidBy` to exactly one Member from the fixed Member list.
5. THE Application SHALL restrict `splitBetween` to a non-empty subset of the fixed Member list.
6. THE Application SHALL record `splitType` as exactly one of `Equal`, `Custom`, `Percentage`, or `Shares`.
7. THE Application SHALL store the per-Member `shares` as a mapping from Member identifier to non-negative Share Amount for each Member in `splitBetween`.

### Requirement 3: Equal Split Calculation

**User Story:** As an admin, I want an expense split equally among selected members, so that each owes the same amount.

#### Acceptance Criteria

1. WHEN `splitType` is `Equal`, THE Split_Calculator SHALL compute each Member's Raw Share as `amount` divided by the count of Members in `splitBetween`.
2. WHEN `splitType` is `Equal`, THE Split_Calculator SHALL produce Share Amounts that are equal for every Member in `splitBetween` after leftover-cent allocation.
3. FOR ALL Expenses with `splitType` `Equal`, THE Split_Calculator SHALL produce Share Amounts whose sum equals the Expense `amount` exactly (2-decimal invariant).
4. WHERE `splitBetween` contains exactly one Member, THE Split_Calculator SHALL assign the full `amount` to that Member.

### Requirement 4: Custom Split Calculation

**User Story:** As an admin, I want to enter exact per-member amounts, so that members can owe different specific values.

#### Acceptance Criteria

1. WHEN `splitType` is `Custom`, THE Application SHALL accept an explicit per-Member amount for each Member in `splitBetween`.
2. WHEN `splitType` is `Custom`, THE Split_Calculator SHALL use the entered per-Member amounts directly as Share Amounts.
3. IF the sum of entered Custom amounts does not equal the Expense `amount` within 2 decimals, THEN THE Application SHALL reject the Expense.
4. FOR ALL accepted Custom Expenses, THE Split_Calculator SHALL preserve the invariant that Share Amounts sum to the Expense `amount` exactly.

### Requirement 5: Percentage Split Calculation

**User Story:** As an admin, I want to split by percentages, so that members owe proportional amounts.

#### Acceptance Criteria

1. WHEN `splitType` is `Percentage`, THE Application SHALL accept a percentage value for each Member in `splitBetween`.
2. WHEN `splitType` is `Percentage`, THE Split_Calculator SHALL compute each Member's Raw Share as `amount` multiplied by the Member's percentage divided by 100.
3. IF the percentages do not sum to exactly 100, THEN THE Application SHALL reject the Expense.
4. FOR ALL accepted Percentage Expenses, THE Split_Calculator SHALL produce Share Amounts whose sum equals the Expense `amount` exactly (2-decimal invariant).

### Requirement 6: Shares Split Calculation

**User Story:** As an admin, I want to split by weighted shares, so that members can owe in configurable ratios.

#### Acceptance Criteria

1. WHEN `splitType` is `Shares`, THE Application SHALL accept a positive weight for each Member in `splitBetween`.
2. WHEN `splitType` is `Shares`, THE Split_Calculator SHALL compute each Member's Raw Share as `amount` multiplied by the Member's weight divided by the total weight of all Members in `splitBetween`.
3. IF any weight is not greater than zero, THEN THE Application SHALL reject the Expense.
4. FOR ALL accepted Shares Expenses, THE Split_Calculator SHALL produce Share Amounts whose sum equals the Expense `amount` exactly (2-decimal invariant).

### Requirement 7: Rounding and Leftover Cent Allocation

**User Story:** As a group member, I want per-member shares to always sum exactly to the expense amount, so that no cents are lost or created.

#### Acceptance Criteria

1. THE Split_Calculator SHALL round each Raw Share to 2 decimals using round-half-up semantics.
2. IF the sum of rounded Share Amounts differs from the Expense `amount`, THEN THE Split_Calculator SHALL distribute the leftover cents using the Largest-Remainder Method.
3. THE Largest-Remainder Method SHALL allocate one cent at a time to the Member with the largest positive rounding remainder, defined as Raw Share minus the rounded Share Amount.
4. WHERE two Members have equal rounding remainders, THE Split_Calculator SHALL break ties by the canonical Member order defined in Requirement 1 to keep results deterministic.
5. FOR ALL split types, THE Split_Calculator SHALL guarantee that Share Amounts sum to the Expense `amount` exactly (2-decimal invariant).
6. FOR ALL split types, THE Split_Calculator SHALL produce identical Share Amounts for identical inputs (idempotence property).

### Requirement 8: Per-Member Owed Amount Resolution

**User Story:** As a group member, I want each expense to clearly record what each included member owes, so that balances are computable.

#### Acceptance Criteria

1. THE Split_Calculator SHALL return, for each Expense, a mapping of Member identifier to Share Amount covering exactly the Members in `splitBetween`.
2. THE Split_Calculator SHALL assign a Share Amount of zero to every Member not in `splitBetween` for that Expense.
3. THE Split_Calculator SHALL ensure the sum of all Share Amounts for an Expense equals the Expense `amount` exactly.

### Requirement 9: Net Balance Computation

**User Story:** As a group member, I want to see how much I am owed or owe overall, so that I know my standing in the group.

#### Acceptance Criteria

1. THE Balance_Calculator SHALL compute each Member's Net Balance as total paid by that Member minus total owed by that Member across all Expenses.
2. THE Balance_Calculator SHALL compute total paid as the sum of `amount` over all Expenses where `paidBy` equals that Member.
3. THE Balance_Calculator SHALL compute total owed as the sum of that Member's Share Amounts across all Expenses where the Member is in `splitBetween`.
4. THE Balance_Calculator SHALL round each Net Balance to 2 decimals.
5. THE Balance_Calculator SHALL produce a positive Net Balance for a Creditor and a negative Net Balance for a Debtor.
6. FOR ALL sets of Expenses, THE Balance_Calculator SHALL guarantee that the sum of all Member Net Balances equals zero (conservation invariant).

### Requirement 10: Debt Simplification

**User Story:** As a group member, I want the fewest payments needed to settle all debts, so that settling up is simple.

#### Acceptance Criteria

1. THE Settlement_Solver SHALL compute Settlements by repeatedly matching the largest Creditor with the largest Debtor until all Net Balances are zero.
2. THE Settlement_Solver SHALL set each Settlement amount to the smaller of the absolute values of the matched Creditor and Debtor balances.
3. THE Settlement_Solver SHALL record the payer as the Debtor and the payee as the Creditor for each Settlement.
4. WHERE two Members have equal absolute balances during matching, THE Settlement_Solver SHALL break ties by the canonical Member order defined in Requirement 1 to keep results deterministic.
5. FOR ALL sets of Expenses, THE Settlement_Solver SHALL guarantee that Settlements zero out every Member's Net Balance exactly.
6. THE Settlement_Solver SHALL produce Settlements only between Members with non-zero balances.
7. THE Settlement_Solver SHALL produce a number of Settlements that does not exceed the number of Members minus one (upper bound invariant).

### Requirement 11: Role Management

**User Story:** As an admin, I want to switch between Admin and User views, so that I can control who can edit the ledger.

#### Acceptance Criteria

1. THE Application SHALL provide a Role Switcher that sets the active role to either Admin or User without authentication.
2. THE Application SHALL store the active role in application state.
3. WHEN the active role changes, THE Application SHALL update visible navigation and route access immediately.
4. WHERE the active role is User, THE Application SHALL hide the Ledger Entry page from navigation.
5. THE Application SHALL persist the active role to `localStorage` so that a page refresh preserves the selected role.

### Requirement 12: Routing and Route Guard

**User Story:** As an admin, I want protected routing, so that a User cannot reach the Ledger Entry page.

#### Acceptance Criteria

1. THE Application SHALL provide client-side routes for the Dashboard and the Ledger Entry page using React Router.
2. THE Application SHALL set the Dashboard as the default route.
3. IF a User attempts to navigate to the Ledger Entry route while the active role is User, THEN THE Application SHALL redirect that request to the Dashboard.
4. THE Application SHALL provide a route guard component that checks the active role before rendering the Ledger Entry page.
5. WHEN the active role is Admin, THE Application SHALL allow navigation to the Ledger Entry page.

### Requirement 13: Dashboard Page

**User Story:** As any role, I want a read-only overview of group finances, so that I can understand who owes whom.

#### Acceptance Criteria

1. THE Dashboard SHALL display four top-level summary stat cards: "Total Paid Till Now" (sum of all expense amounts), "Top Payer" (member with highest total paid, showing amount and % of total), "Active Payers" (count of members who have paid at least one expense, shown as X/7 with subtitle), and "Equal Share / Member" (total amount divided by 7, shown as fair share per member).
2. THE Dashboard SHALL display a "Who Paid How Much Till Now" section with a member count badge showing "7 Members".
3. THE Dashboard SHALL display each member as a card in a responsive grid. Each member card SHALL show: initials avatar (2-letter, colored), member name, payment count and % of total, total paid so far with ₹ prefix, a colored progress bar representing proportion of total paid, fair share amount, and a status badge — green "Gets back {amount}" for creditors (net > 0) or amber "Owes {amount}" for debtors (net < 0).
4. THE Dashboard SHALL provide a view toggle with two options: "Cards View" (default, member cards grid) and "Paid vs Share Comparison" (alternative view).
5. THE Dashboard SHALL display a "All settled in group" status text in the Total Paid card when all member net balances are zero.
6. THE Dashboard SHALL display the list of Settlements produced by the Settlement_Solver.
7. THE Dashboard SHALL update all displayed values immediately when Expenses change.
8. WHILE the active role is User, THE Dashboard SHALL render identically to the Admin view but without navigation to the Ledger Entry page.

### Requirement 14: Ledger Entry - Expense CRUD

**User Story:** As an admin, I want to create, edit, and delete expenses, so that I can keep the ledger accurate.

#### Acceptance Criteria

1. WHILE the active role is Admin, THE Ledger Entry Page SHALL display a form to create a new Expense.
2. WHILE the active role is Admin, THE Ledger Entry Page SHALL display a table listing all existing Expenses.
3. WHEN the Admin submits a valid new Expense, THE Application SHALL add the Expense to the ledger and recompute balances and settlements.
4. WHEN the Admin edits an existing Expense with valid input, THE Application SHALL update the Expense and recompute balances and settlements.
5. WHEN the Admin deletes an Expense, THE Application SHALL remove the Expense and recompute balances and settlements.
6. WHEN the active role is User, THE Application SHALL not render the Ledger Entry page.

### Requirement 15: Expense Validation

**User Story:** As an admin, I want validation feedback, so that I cannot save invalid expenses.

#### Acceptance Criteria

1. IF `amount` is not greater than zero, THEN THE Application SHALL reject the Expense and display a validation error.
2. IF `paidBy` is not set to a Member, THEN THE Application SHALL reject the Expense and display a validation error.
3. IF `splitBetween` is empty, THEN THE Application SHALL reject the Expense and display a validation error.
4. IF `splitType` is `Percentage` and the percentages do not sum to 100, THEN THE Application SHALL reject the Expense and display a validation error.
5. IF `splitType` is `Shares` and any weight is not greater than zero, THEN THE Application SHALL reject the Expense and display a validation error.
6. IF `splitType` is `Custom` and the entered amounts do not sum to `amount`, THEN THE Application SHALL reject the Expense and display a validation error.
7. THE Application SHALL maintain, as an unconditional invariant, that validation errors are displayed adjacent to their corresponding form fields.

### Requirement 16: Chat-Style Text Parsing

**User Story:** As an admin, I want to paste chat-style expense lines and have them parsed, so that I can enter many expenses quickly.

#### Acceptance Criteria

1. THE Chat_Parser SHALL treat every line of pasted input as one Expense candidate, unconditionally across all input contexts.
2. THE Chat_Parser SHALL extract, from each parseable line, the `amount`, `paidBy`, and `description` into an Expense candidate.
3. WHEN the Chat_Parser parses a line, THE Chat_Parser SHALL apply a default `splitType` of Equal among all Members unless the line specifies otherwise.
4. IF a line cannot be parsed with high confidence, THEN THE Chat_Parser SHALL flag that line for manual confirmation rather than creating an Expense automatically.
5. WHEN flagged lines exist, THE Application SHALL present each flagged line to the Admin for review before committing any Expense from the pasted batch.
6. THE Chat_Parser SHALL not mutate application state directly; parsing SHALL return parsed candidates and flagged lines as data.

### Requirement 17: State Management and Persistence

**User Story:** As a user, I want my data to survive a page refresh, so that I do not lose entered expenses.

#### Acceptance Criteria

1. THE Application SHALL manage Expenses, the active role, and derived balances using a single state container built with Context and `useReducer` or an equivalent justified store.
2. THE Application SHALL derive balances and settlements from Expenses via pure functions rather than storing them as separate state.
3. THE Application SHALL persist Expenses to `localStorage` on every change.
4. THE Application SHALL persist the active role to `localStorage` on every change.
5. WHEN the Application loads, THE Application SHALL hydrate Expenses and the active role from `localStorage` if present, otherwise initialize to an empty ledger.
6. FOR ALL ledgers, THE Application SHALL guarantee that serializing Expenses to `localStorage` and then parsing them back yields an equivalent ledger (round-trip property).
7. IF a specific persisted field in `localStorage` is corrupt or fails to parse, THEN THE Application SHALL reset only that corrupted field to its default value, preserve all other valid persisted data, and log a warning.

### Requirement 18: UI Accessibility and Responsiveness

**User Story:** As any user, I want a usable interface on any device, so that I can use the application comfortably.

#### Acceptance Criteria

1. THE Application SHALL render correctly on mobile, tablet, and desktop viewport widths.
2. THE Application SHALL provide keyboard operability for all interactive controls.
3. THE Application SHALL provide visible focus indicators for focusable elements.
4. THE Application SHALL label form controls with associated labels for assistive technology.
5. THE Application SHALL use semantic HTML for page structure and navigation.

### Requirement 19: Utility Function Testing

**User Story:** As a developer, I want automated tests for calculation logic, so that splits, rounding, balances, and settlements are verified.

#### Acceptance Criteria

1. THE Test_Suite SHALL include unit tests for Equal split calculation including the one-member case.
2. THE Test_Suite SHALL include unit tests for Percentage split calculation including the 100-total enforcement.
3. THE Test_Suite SHALL include unit tests for Shares split calculation including the positive-weight enforcement.
4. THE Test_Suite SHALL include unit tests for Custom split calculation including the sum-equals-amount enforcement.
5. THE Test_Suite SHALL include unit tests for exclusion cases where a payer is not in `splitBetween`.
6. THE Test_Suite SHALL include unit tests for rounding edge cases verifying that Share Amounts sum exactly to `amount`.
7. THE Test_Suite SHALL include unit tests for the Largest-Remainder Method verifying deterministic allocation and tie-breaking.
8. THE Test_Suite SHALL include unit tests for Net Balance computation verifying the zero-sum invariant.
9. THE Test_Suite SHALL include unit tests for Debt Simplification verifying that Settlements zero all balances and respect the member-count-minus-one upper bound.

### Requirement 20: Expense Serialization for Persistence

**User Story:** As a developer, I want a reliable serializer for expenses, so that persistence round-trips without data loss.

#### Acceptance Criteria

1. THE Serializer SHALL convert an Expense to a JSON-compatible representation including all fields defined in Requirement 2.
2. THE Serializer SHALL convert a JSON-compatible representation back into an Expense preserving all fields.
3. FOR ALL Expenses, THE Serializer SHALL guarantee that parsing the serialized output yields an Expense equal to the original (round-trip property).
4. THE Serializer SHALL preserve Member identifiers, `splitType`, and per-Member `shares` across serialization and parsing.

### Requirement 21: Dashboard Header and Record Expense CTA

**User Story:** As an admin, I want a prominent "Record Expense" button in the dashboard header, so that I can quickly navigate to add a new expense.

#### Acceptance Criteria

1. THE Dashboard header SHALL display the application title "Payment & Balance Dashboard" with a subtitle "Detailed ledger showing who paid how much till now and real-time net balances".
2. THE Dashboard header SHALL display a "Synced" status badge indicating data is persisted.
3. WHILE the active role is Admin, THE Dashboard header SHALL display a "+ Record Expense" button that navigates to the Ledger Entry page.
4. WHILE the active role is User, THE Dashboard header SHALL hide the "+ Record Expense" button.
