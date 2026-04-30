# Receipt Scan

A receipt scanner and personal finance tracker for capturing receipts, extracting purchase data, categorizing spending, and reviewing monthly trends.

## Current MVP (implemented)

- Upload receipt images or capture from mobile camera.
- Generate per-file mocked OCR extraction (deterministic by file content) for fast iteration.
- Review and edit extracted merchant/date/line items before saving.
- Track totals, category spend, necessity spend, and merchant trends.
- Search saved ingredient line items.
- Export receipt item data as CSV.
- Inspect raw OCR output for each scan and for saved receipts.

## Run locally

```bash
npm install
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

- The OCR pipeline is currently **mocked** for MVP speed, but now varies by uploaded file.
- Receipt data is persisted in browser `localStorage` in this MVP.
- See `docs/ROADMAP.md` for server-side persistence and real OCR follow-ups.
