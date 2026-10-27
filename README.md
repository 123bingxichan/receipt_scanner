# Receipt Scan

A receipt scanner and personal finance tracker for capturing receipts, extracting purchase data, categorizing spending, and reviewing monthly trends.

## Current MVP (implemented)

- Upload receipt images or capture from mobile camera.
- Server-side OCR (`OCR_PROVIDER=mock` for dev, `ocr_space` for real scans) with parsing into merchant, date, line items, subtotal, tax and total.
- Review and edit extracted merchant/date/line items before saving.
- Track totals, category spend, necessity spend, and merchant trends.
- Search saved ingredient line items.
- Export receipt item data as CSV.
- Inspect raw OCR output for each scan and for saved receipts.

## Run locally

```bash
npm install
cp .env.example .env.local        # set DATABASE_URL, optionally OCR_SPACE_API_KEY
npm run db:generate
npx prisma migrate deploy         # or `npm run db:migrate` in development
npm run dev
```

Open `http://localhost:3000`.

## Useful scripts

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Notes

- Receipts, line items and expenses are stored in Postgres via Prisma. Images are stored through a storage adapter (local disk in `.uploads/` by default).
- API: `POST /api/receipts` (upload + OCR, creates a `NEEDS_REVIEW` receipt), `GET /api/receipts?status=`, `GET|PATCH|DELETE /api/receipts/:id`, `POST /api/receipts/:id/approve` (creates one Expense, idempotent), `GET /api/receipts/:id/image`.
- There is no auth yet: every request acts as one local user (`DEFAULT_USER_EMAIL`). All queries are already scoped by `userId`.
- Integration test (needs Postgres): `RUN_DB_TESTS=1 npm test`.
- Existing browser `localStorage` receipts (`receipt-scan-v1`) are not migrated.
- See `docs/ROADMAP.md` for remaining work (auth, S3 storage, rate limits, e2e tests, deployment docs).
