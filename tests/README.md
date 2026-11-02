# Tests

Layout:

- `tests/unit`: parsing, validation, categorization, CSV, OCR providers, storage, error mapping. No database.
- `tests/api`: route handlers called directly with the database layer mocked (real temp-dir storage, mock OCR).
- `tests/integration`: the real routes against a real Postgres. Skipped unless `RUN_DB_TESTS=1`.
- `tests/e2e`: browser-level upload, review, and dashboard flows (not written yet).

```bash
npm test                      # unit + api
RUN_DB_TESTS=1 npm test       # also integration, using DATABASE_URL from .env
```

Integration tests create users with unique emails and delete them afterwards (cascading to receipts, items and expenses).

CI (`.github/workflows/ci.yml`) starts a `postgres:16` service, applies the migrations with `prisma migrate deploy`, and runs everything with `RUN_DB_TESTS=1`, so a broken migration or schema change fails the build.

Start with unit tests around money handling and OCR result validation because mistakes there directly affect financial records.
