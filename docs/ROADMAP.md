# Roadmap

## Phase 1: Repo and UI Foundation

- Install dependencies.
- Confirm Next.js app boots locally.
- Add base navigation and page shell.
- Add upload page skeleton.

## Phase 2: Persistence

- Configure PostgreSQL.
- Run initial Prisma migration.
- Add Prisma client helper.
- Implement receipt create/list/detail flows.

## Phase 3: Receipt Upload

- Add file upload form.
- Implement local storage adapter.
- Save receipt image metadata.
- Add image preview and receipt detail page.

## Phase 4: OCR

- Implement mock OCR adapter for development.
- Add real OCR provider adapter.
- Persist extracted fields and line items.
- Add review/edit workflow.

## Phase 5: Finance Tracking

- Create expenses from approved receipts.
- Add categories.
- Add monthly dashboard.
- Add CSV export.

## Phase 6: Production Readiness

- Add authentication.
- Add object storage.
- Add rate limits and file validation.
- Add integration and e2e tests.
- Add deployment documentation.
