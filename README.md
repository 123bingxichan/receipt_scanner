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
cp .env.example .env              # set DATABASE_URL (see Database below), optionally OCR_SPACE_API_KEY
npm run db:generate
npm run db:migrate                # creates the database if missing and applies migrations
npm run dev
```

Open `http://localhost:3000`.

Keep `DATABASE_URL` in `.env`, not `.env.local`: Next.js reads both, but the Prisma CLI only reads `.env`, so a copy in `.env.local` can silently point the app and the migrations at different databases.

## Database

The app needs any PostgreSQL server; it only reads `DATABASE_URL`. Pick one:

- **Local:** install PostgreSQL, or run `docker run -d --name receipt-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`, then use `postgresql://postgres:postgres@localhost:5432/receipt_scan`.
- **Hosted (Neon, Supabase, Railway, ...):** create a project and paste its connection string into `DATABASE_URL`. Use the direct (non-pooled) connection string for `npm run db:migrate`; pooled endpoints (Neon's `-pooler` host, Supabase's port 6543) can break migrations.

If the password contains URL-reserved characters, percent-encode them (`#` → `%23`, `@` → `%40`, `/` → `%2F`, `?` → `%3F`). An unencoded `#` truncates the URL and Prisma reports the wrong host.

Receipt images are still written to local disk (`.uploads/`) whichever database you use; the S3 adapter is not implemented yet, so a hosted database does not make the app deployable to a serverless host by itself.

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
- Tests: `npm test` runs unit and API-route tests with no database. `RUN_DB_TESTS=1 npm test` also runs the Postgres integration tests against `DATABASE_URL` (they create throwaway users and delete them afterwards).
- Unexpected API failures return JSON (`503` when the database is unreachable, `500` otherwise), never an empty body.
- Existing browser `localStorage` receipts (`receipt-scan-v1`) are not migrated.
- See `docs/ROADMAP.md` for remaining work (auth, S3 storage, rate limits, e2e tests, deployment docs).
