# Receipt Scan

A receipt scanner and personal finance tracker for capturing receipts, extracting purchase data, categorizing spending, and reviewing monthly trends.

## Current Features

- Upload receipt images or capture from mobile camera.
- Scan receipts with OCR.Space through a server API route.
- Upload from desktop or scan with mobile camera.
- View full OCR text plus detected line-by-line output.
- Export OCR lines to CSV for downstream analysis.

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

## Environment

Create `.env.local` with your OCR key:

```bash
OCR_SPACE_API_KEY=your_key_here
```
