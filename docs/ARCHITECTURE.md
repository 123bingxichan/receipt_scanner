# Architecture

## App Boundary

Use the Next.js app as the main product surface. Keep domain logic in `lib/` so receipt parsing, storage, and database operations can be tested without rendering React components.

## Main Services

- `lib/ocr`: extracts structured receipt data from images.
- `lib/storage`: stores and retrieves receipt image files.
- `lib/db`: owns Prisma client setup and persistence helpers.
- `app`: routes, screens, forms, and server actions.

## Data Flow

1. Upload image.
2. Save image through the storage adapter.
3. Create `Receipt` record with `UPLOADED` status.
4. Run OCR extraction.
5. Save extracted fields and line items.
6. Mark receipt as `NEEDS_REVIEW`.
7. User approves or edits extracted data.
8. Create an `Expense` record from the approved receipt.

## Design Constraints

- Treat OCR output as untrusted until reviewed.
- Store money as integer cents.
- Keep original images for auditability.
- Use provider adapters for OCR and storage.
- Keep user data isolated by `userId` on every user-owned record.
