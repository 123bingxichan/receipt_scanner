# Data Model

## User

Owns receipts and expenses.

## Receipt

Represents the source document and extracted purchase summary.

Important fields:

- `imageUrl`
- `merchantName`
- `purchasedAt`
- `subtotalCents`
- `taxCents`
- `totalCents`
- `status`
- `confidence`

## LineItem

Represents individual products or services extracted from a receipt.

## Expense

Represents financial tracking data used by reports and exports. A receipt can create an expense, but expenses can also be entered manually.

## Category

Groups expenses for budgeting and reporting.
