# Kalpa

Kalpa is a shared, mobile-friendly expense tracker for a fixed group of seven people. It provides a clear live picture of contributions, fair shares, net balances, and the smallest practical set of settlement transfers.

The group is fixed to Ankit, Bhargav, Devansh, Dhvanil, Kashyap, Ish, and Sagar. The application is designed for a single trusted group rather than for public, multi-group account management.

## Product overview

The dashboard is the group’s financial snapshot. It shows:

- Total group spending and total recorded expenses
- The member who has contributed the most
- Active contributors and the equal-share reference amount
- A contribution and balance card for each member
- A paid-versus-share comparison view
- The simplified transfers required to settle the group

The ledger is the group’s shared workspace. Anyone in the group can:

- Add an expense with a date, description, amount, payer, and split method
- Edit or delete any recorded expense
- Choose exactly which members are included in an expense
- Paste chat-style notes for review before creating expenses

Everyone in the group can access both the dashboard and ledger pages.

## Expense model

Every expense contains:

- A stable identifier
- Calendar date and description
- Amount in INR, stored to two decimal places
- One member who paid
- One split type
- A non-empty subset of members who share the expense
- Final per-member owed amounts
- The original split input, retained for editing

The shared ledger is stored as complete expense records, so an edit always recalculates the associated per-member shares and all downstream balances.

## Split methods

Kalpa supports four ways to divide an expense:

| Method     | Behaviour                                           |
| ---------- | --------------------------------------------------- |
| Equal      | Divides the total evenly across selected members.   |
| Custom     | Uses exact entered amounts for selected members.    |
| Percentage | Uses entered percentages, which must add up to 100. |
| Shares     | Uses positive relative weights, such as 1:2:3.      |

The payer does not need to be included in the split. This supports expenses paid on behalf of others.

## Rounding and accuracy

All monetary values are represented to two decimal places. For equal, percentage, and weighted-share splits, Kalpa uses deterministic largest-remainder allocation:

1. It computes each member’s unrounded share.
2. It assigns whole cents from those values.
3. Remaining cents go to the largest fractional remainders.
4. Ties follow the group’s fixed member order.

This guarantees that individual shares always total exactly to the expense amount, with no lost or created paise.

## Balances and settlement

For each member:

    net balance = total paid − total owed

A positive balance means the member should receive money. A negative balance means the member owes money.

Kalpa simplifies the group debt by repeatedly matching the largest creditor with the largest debtor. Each generated transfer uses the smaller outstanding balance. The result clears every balance using no more than six transfers for this seven-member group.

## Shared data behaviour

Expenses are synchronized through Supabase and update open clients in real time. The browser keeps a local cache so the ledger can still render while a device is offline or the remote service is temporarily unavailable.

The supplied Kalpa trip records are included as starter data when a fresh ledger is initialized:

| Expense       | Paid by |     Amount |
| ------------- | ------- | ---------: |
| Kalpa Hostel  | Ish     | ₹19,580.00 |
| Train         | Devansh | ₹10,132.00 |
| Train         | Devansh |  ₹6,490.00 |
| Train         | Ish     | ₹13,645.00 |
| Fagu Stay     | Ankit   | ₹12,500.00 |
| Narkanda Stay | Ish     |  ₹9,880.00 |

Each starter expense is split equally across all seven members.

## Architecture

The client is built with React, TypeScript, React Router, and Supabase.

| Area                  | Responsibility                                                     |
| --------------------- | ------------------------------------------------------------------ |
| Components and pages  | Responsive dashboard, ledger, form controls, shared navigation |
| Context and reducer   | Optimistic expense CRUD and remote synchronization state |
| Calculation utilities | Pure share, rounding, validation, balance, and settlement logic    |
| Supabase              | Shared expense persistence and realtime change delivery            |
| Local storage         | Browser cache                                                      |

The calculation layer is intentionally independent from React, keeping the money rules isolated and testable.
