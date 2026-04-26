# Security Notes

- Validate file type and size before accepting uploads.
- Do not trust OCR output without user review.
- Keep receipt images private by default.
- Scope every receipt and expense query by authenticated user ID.
- Never expose raw storage keys in public URLs unless they are short-lived signed URLs.
- Avoid logging receipt image contents, OCR text, or payment details.
- Treat receipts as sensitive financial documents.
