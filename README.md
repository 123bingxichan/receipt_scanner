# Receipt Scan

A receipt scanner and personal finance tracker for capturing receipts, extracting purchase data, categorizing spending, and reviewing monthly trends.

## Project Goals

- Upload or capture receipt images from desktop and mobile.
- Extract merchant, date, total, tax, payment method, and line items.
- Let users review and correct extracted data before saving.
- Categorize expenses and track spending over time.
- Export clean transaction data for accounting or budgeting tools.

## Suggested Stack

- **App:** Next.js, React, TypeScript
- **UI:** Tailwind CSS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **OCR:** Pluggable service layer for OpenAI Vision, Tesseract, or cloud OCR APIs
- **Auth:** NextAuth/Auth.js or a managed auth provider
- **Storage:** Local development storage first, then S3-compatible object storage

## Repository Layout

```text
.
├── app/                  # Next.js app routes and pages
├── components/           # Shared React components
├── docs/                 # Product, architecture, and data model notes
├── lib/                  # Server/client utilities and domain services
├── prisma/               # Database schema and migrations
├── public/               # Static assets
├── tests/                # Unit, integration, and e2e tests
└── .github/workflows/    # CI workflows
```

## Getting Started

This repo is scaffolded for a future implementation pass. After installing dependencies, the expected workflow will be:

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in local values before running database-backed features.

## Core User Flow

1. User uploads or captures a receipt image.
2. App stores the original image.
3. OCR service extracts structured receipt data.
4. User reviews and corrects the extracted fields.
5. App saves the receipt and creates one or more expense records.
6. Dashboard summarizes spending by month, merchant, category, and payment method.

## Status

Initial repository scaffold only. See `docs/ROADMAP.md` for a recommended build order.
